import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {requireUser} from '@/lib/supabase-server';
import {adminDb} from '@/lib/supabase-admin';
import {BytePlusProvider,ProviderError,IMAGE_MODEL} from '@/lib/byteplus';
import {handleError,jsonError} from '@/lib/api';
import {ADMIN_EMAIL} from '@/lib/admin-access';
import {getQuote} from '@/lib/billing';
export const runtime='nodejs';
export const maxDuration=180;
const Schema=z.object({requestId:z.string().uuid(),influencerId:z.string().uuid(),type:z.enum(['image','video']),prompt:z.string().trim().min(10).max(1800),ratio:z.enum(['9:16','1:1','16:9']),quality:z.literal('standard').default('standard'),expectedCredits:z.number().int().positive()});
export async function POST(req:Request){
 let requestId:string|undefined;let jobId:string|undefined;let stage='before';
 try{
 const {user,db}=await requireUser();if(!user||!db)return jsonError('Entre para criar sua imagem.',401);
 const input=Schema.parse(await req.json());
 if(input.type==='video')return jsonError('A geração de vídeos ainda não está disponível. Nenhum crédito foi descontado.',503);
 if(process.env.BYTEPLUS_GENERATION_ENABLED!=='true'||!(process.env.BYTEPLUS_API_KEY||process.env.BYTEPLUS_MODELARK_API_KEY))return jsonError('Geração de imagens temporariamente indisponível.',503);
 const pricingResult=await getQuote().catch(()=>null);if(!pricingResult)return jsonError('A tabela de preços está indisponível ou venceu. Aguarde a atualização pelo administrador.',503);const {pricing,quote}=pricingResult;
 const owner=user.email?.toLowerCase()===ADMIN_EMAIL&&!!user.email_confirmed_at&&(!process.env.ADMIN_USER_ID||user.id===process.env.ADMIN_USER_ID);
 if(!owner&&!pricing.public_enabled)return jsonError('O estúdio ainda está em testes. A geração será liberada em breve.',403);
 if(input.expectedCredits!==quote.credits)return jsonError('O preço foi atualizado. Confira o novo valor antes de gerar.',409);
 const {data:character,error}=await db.from('influencers').select('*').eq('id',input.influencerId).eq('user_id',user.id).single();
 if(error||!character)return jsonError('Personagem não encontrado.',404);
 const admin=adminDb();
 let referenceImage:string|undefined;
 if(character.reference_path){if(!character.reference_path.startsWith(user.id+'/references/')||character.reference_path.includes('..'))return jsonError('Referência inválida. Cadastre novamente o personagem.',422);const r=await admin.storage.from('creations').createSignedUrl(character.reference_path,600);if(r.error||!r.data)throw Error('Reference unavailable');referenceImage=r.data.signedUrl;}
 const fingerprint=createHash('sha256').update(JSON.stringify({...input,requestId:undefined})).digest('hex');
 const payload={...input,provider:'byteplus',model:IMAGE_MODEL,quote,pricing,usage:null};
 const reserved=await admin.rpc('veox_reserve',{p_id:input.requestId,p_user:user.id,p_character:character.id,p_fingerprint:fingerprint,p_credits:quote.credits,p_cost:quote.costBrl,p_payload:payload,p_daily:pricing.daily_limit,p_budget:pricing.daily_budget_brl});
 if(reserved.error){const msg=reserved.error.message;return jsonError(msg.includes('Insufficient')?'Você não tem créditos suficientes.':msg.includes('pending')?'Você já tem uma criação em andamento ou aguardando conferência.':msg.includes('Daily')?'O limite diário foi atingido. Tente novamente amanhã.':'Não foi possível reservar os créditos. Contate o suporte.',409)}
 const result=reserved.data as {fresh:boolean;jobId:string;state:string};
 if(!result.fresh)return NextResponse.json({jobId:result.jobId,status:result.state,message:'Esta solicitação já está registrada. Consulte seu histórico.'});
 requestId=input.requestId;jobId=result.jobId;stage='reserved';
 const size=({'9:16':'1440x2560','16:9':'2560x1440','1:1':'2048x2048'} as const)[input.ratio];
 const prompt=`Personagem: ${character.name}. Identidade: ${character.description}. Estilo: ${character.style}. Personalidade: ${character.vibe}. Preserve a aparência da referência quando fornecida. Cena: ${input.prompt}`;
 // Mark uncertain before crossing the paid provider boundary. Never retry a POST automatically.
 const mark=await admin.from('veox_requests').update({state:'submitted'}).eq('id',requestId);if(mark.error)throw mark.error;
 stage='submitted';
 const output=await new BytePlusProvider().createImage({prompt:prompt.slice(0,3600),size,referenceImage});
 stage='received';
 const first=output.data?.[0];if(!first)throw Error('Provider returned no image');
 const saved=await admin.from('generation_jobs').update({payload:{...payload,usage:output.usage??null,provider_result_url:first.url??null}}).eq('id',jobId);if(saved.error)throw saved.error;
 let bytes:Buffer;
 if(first.b64_json)bytes=Buffer.from(first.b64_json,'base64');
 else if(first.url){const url=new URL(first.url);if(url.protocol!=='https:')throw Error('Invalid output URL');const r=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error('Download unavailable');bytes=Buffer.from(await r.arrayBuffer());}
 else throw Error('Provider returned no data');
 if(bytes.length>25*1024*1024)throw Error('Image exceeds size limit');
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!png&&!jpg&&!webp)throw Error('Invalid image');
 const ext=png?'png':jpg?'jpg':'webp',path=`${user.id}/${jobId}.${ext}`;
 const upload=await admin.storage.from('creations').upload(path,bytes,{contentType:png?'image/png':jpg?'image/jpeg':'image/webp',upsert:false});if(upload.error)throw upload.error;
 const asset=await admin.from('assets').insert({user_id:user.id,influencer_id:character.id,job_id:jobId,kind:'image',storage_path:path});if(asset.error)throw asset.error;
 const complete=await admin.from('generation_jobs').update({status:'completed',completed_at:new Date().toISOString(),error_message:null}).eq('id',jobId);if(complete.error)throw complete.error;
 const billed=await admin.from('veox_requests').update({state:'completed'}).eq('id',requestId);if(billed.error)throw billed.error;
 return NextResponse.json({jobId,status:'completed',message:`Imagem pronta! Foram utilizados ${quote.credits} créditos.`},{status:201});
 }catch(e){
 console.error('[VEOX generation]',{requestId,jobId,stage,error:e});
 if(requestId&&jobId){const admin=adminDb();
 // Only explicit pre-generation rejections are refundable automatically. Unknown charges need reconciliation.
 const rejected=e instanceof ProviderError&&[400,401,403,404,422,429].includes(e.status);
 if(stage==='reserved'||rejected){
 const mark=await admin.from('veox_requests').update({state:'review'}).eq('id',requestId);
 const refund=mark.error?{error:mark.error}:await admin.rpc('veox_refund',{p_id:requestId});
 if(!refund.error)return jsonError('Não foi possível gerar a imagem. Seus créditos foram devolvidos.',502);
 }
 await admin.from('veox_requests').update({state:'review'}).eq('id',requestId);
 await admin.from('generation_jobs').update({error_message:'A criação precisa de conferência. Seus créditos estão reservados; não repita o pedido.'}).eq('id',jobId);
 return jsonError('Não foi possível confirmar o resultado. Seus créditos estão reservados para conferência pelo suporte.',503);
 }
 return handleError(e);
 }
}
