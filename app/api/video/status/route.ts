import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/supabase-server';
import {adminDb} from '@/lib/supabase-admin';
import {BytePlusProvider} from '@/lib/byteplus';
import {videoTestPermitted} from '@/lib/video-gate';
import {handleError,jsonError} from '@/lib/api';
export const runtime='nodejs';
const Body=z.object({jobId:z.string().uuid()});

export async function POST(request:Request){
 try{
  const {user,error}=await requireUser();
  if(!user)return jsonError(error||'Não autorizado',401);
  if(!videoTestPermitted(user.id))return jsonError('Acompanhamento de vídeo restrito ao administrador de testes.',403);
  const {jobId}=Body.parse(await request.json());
  const admin=adminDb();
  const {data:job,error:loadError}=await admin.from('generation_jobs').select('id,user_id,influencer_id,status,payload,type').eq('id',jobId).eq('user_id',user.id).single();
  if(loadError||!job)return jsonError('Geração não encontrada',404);
  if(job.type!=='video')return jsonError('Esta tarefa não é um vídeo.',400);
  if(job.status==='completed'||job.status==='failed')return NextResponse.json({status:job.status,jobId});
  const payload=job.payload as Record<string,unknown>;
  const externalId=payload?.external_task_id;
  if(typeof externalId!=='string')return jsonError('Tarefa sem ID externo. Verifique o histórico.',409);
  const state=await new BytePlusProvider().getVideo(externalId);
  if(state.status==='succeeded'){
   if(!state.content?.video_url)throw new Error('BytePlus concluiu sem fornecer URL de vídeo.');
   const response=await fetch(state.content.video_url,{cache:'no-store',signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw new Error('Vídeo pronto, mas download temporariamente indisponível. Tente atualizar novamente.');
   const file=Buffer.from(await response.arrayBuffer());
   if(file.byteLength>90*1024*1024)throw new Error('Vídeo excede o limite de 90 MB. Necessária transferência via worker.');
   if(file.length<16||file.toString('ascii',4,8)!=='ftyp')throw new Error('Arquivo retornado não é MP4/MOV válido.');
   const path=`${user.id}/${job.id}.mp4`;
   const upload=await admin.storage.from('creations').upload(path,file,{contentType:'video/mp4',upsert:false});
   if(upload.error&&!upload.error.message.toLowerCase().includes('exist'))throw upload.error;
   const {data:existing,error:existingError}=await admin.from('assets').select('id').eq('job_id',jobId).limit(1);
   if(existingError)throw existingError;
   if(!existing?.length){
     const {error:assetError}=await admin.from('assets').insert({user_id:user.id,influencer_id:job.influencer_id,job_id:job.id,kind:'video',storage_path:path});
     if(assetError)throw assetError;
   }
   const {error:updateError}=await admin.from('generation_jobs').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',jobId).eq('user_id',user.id);
   if(updateError)throw updateError;
   return NextResponse.json({jobId,status:'completed'});
  }
  if(state.status==='failed'||state.status==='expired'){
   await admin.from('generation_jobs').update({status:'failed',error_message:'BytePlus: '+state.status,completed_at:new Date().toISOString()}).eq('id',jobId);
   return NextResponse.json({jobId,status:'failed'});
  }
  return NextResponse.json({jobId,status:'processing',providerStatus:state.status});
 }catch(err){return handleError(err)}
}
