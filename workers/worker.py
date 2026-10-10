"""Minimal real ComfyUI image worker; video requires a separate configured lip-sync pipeline.
Run in a trusted GPU environment only. NEVER expose Supabase service role to the web client.
A workflow exported using ComfyUI > Save (API format) is required.
"""
import os,json,time,copy,logging,requests,secrets
from pathlib import Path
logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s')
S=os.environ['SUPABASE_URL'].rstrip('/')
KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY']
C=os.environ.get('COMFYUI_URL','http://127.0.0.1:8188').rstrip('/')
HEAD={'apikey':KEY,'Authorization':f'Bearer {KEY}','Content-Type':'application/json'}
s=requests.Session();s.headers.update(HEAD)

def call(method,endpoint,**kw):
    r=s.request(method,S+'/rest/v1/'+endpoint,timeout=25,**kw);r.raise_for_status();return r.json() if r.content else None

def status(job_id,state,error=None):
    call('PATCH',f'generation_jobs?id=eq.{job_id}',json={'status':state,'error_message':error,'completed_at':None if state=='processing' else time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},headers={'Prefer':'return=minimal'})

def process(job):
    payload=job['payload']
    if job['type']!='image':
        raise RuntimeError('Video com voz exige pipeline adicional MuseTalk/geração de vídeo; não está incluído neste worker de imagem.')
    wf=Path(os.environ.get('COMFYUI_WORKFLOW_FILE','workflow_api.json'))
    if not wf.exists():raise RuntimeError(f'Workflow ComfyUI não encontrado: {wf}')
    workflow=json.loads(wf.read_text(encoding='utf-8'))
    checkpoint=os.environ.get('COMFYUI_CHECKPOINT','')
    if checkpoint:
        for node_data in workflow.values():
            if node_data.get('class_type')=='CheckpointLoaderSimple':
                node_data['inputs']['ckpt_name']=checkpoint
    node=os.environ.get('COMFYUI_PROMPT_NODE_ID','6')
    if node not in workflow or 'text' not in workflow[node]['inputs']:
        raise RuntimeError('COMFYUI_PROMPT_NODE_ID não aponta para um nó CLIPTextEncode válido.')
    prompt=payload.get('prompt','')
    if not isinstance(prompt,str) or len(prompt)<10 or len(prompt)>1800:raise RuntimeError('Prompt inválido')
    workflow[node]['inputs']['text']=prompt
    for nd in workflow.values():
        if nd.get('class_type')=='KSampler':nd['inputs']['seed']=secrets.randbelow(2**53)
    ratio=payload.get('ratio','9:16')
    sizes={'9:16':(576,1024),'1:1':(768,768),'16:9':(1024,576)}
    if ratio not in sizes:raise RuntimeError('Proporção inválida')
    for nd in workflow.values():
        if nd.get('class_type')=='EmptyLatentImage':
            nd['inputs']['width'],nd['inputs']['height']=sizes[ratio]
    resp=requests.post(C+'/prompt',json={'prompt':workflow},timeout=25);resp.raise_for_status()
    prompt_id=resp.json()['prompt_id']
    history=None
    for _ in range(240):
        time.sleep(2)
        r=requests.get(C+'/history/'+prompt_id,timeout=20);r.raise_for_status()
        history=r.json().get(prompt_id)
        if history:
            if history.get('status',{}).get('status_str')=='error':raise RuntimeError('ComfyUI falhou durante a geração')
            break
    if not history:raise TimeoutError('Tempo limite do ComfyUI excedido')
    output_node=os.environ.get('COMFYUI_OUTPUT_NODE_ID','9')
    images=history.get('outputs',{}).get(output_node,{}).get('images',[])
    if not images:raise RuntimeError('Nó de saída não retornou imagem; confira COMFYUI_OUTPUT_NODE_ID')
    image=images[0]
    file_res=requests.get(C+'/view',params={'filename':image['filename'],'subfolder':image.get('subfolder',''),'type':image.get('type','output')},timeout=90);file_res.raise_for_status()
    kind=file_res.headers.get('content-type','image/png').split(';')[0]
    if kind not in ('image/png','image/jpeg','image/webp'):raise RuntimeError('Formato de imagem não suportado')
    ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[kind]
    path=f"{job['user_id']}/{job['id']}.{ext}"
    upload=requests.post(S+'/storage/v1/object/creations/'+path,headers={'Authorization':f'Bearer {KEY}','apikey':KEY,'Content-Type':kind,'x-upsert':'false'},data=file_res.content,timeout=90)
    upload.raise_for_status()
    call('POST','assets',json={'user_id':job['user_id'],'influencer_id':job['influencer_id'],'job_id':job['id'],'kind':'image','storage_path':path},headers={'Prefer':'return=minimal'})

def rpc_claim():
    r=s.post(S+'/rest/v1/rpc/claim_next_generation_job',json={},timeout=25)
    r.raise_for_status()
    return r.json()

def main():
    logging.info('GPU image worker started (single-worker).')
    while True:
        try:
            jobs=rpc_claim()
            if jobs:
                job=jobs[0]
                try:
                    process(job)
                    status(job['id'],'completed')
                    logging.info('Completed %s',job['id'])
                except Exception as ex:
                    logging.exception('Job failed %s',job['id'])
                    status(job['id'],'failed',str(ex)[:500])
        except Exception:logging.exception('Worker loop failure')
        time.sleep(float(os.environ.get('POLL_SECONDS','8')))
if __name__=='__main__':main()
