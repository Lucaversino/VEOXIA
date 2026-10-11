import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/supabase-server';
import {adminDb} from '@/lib/supabase-admin';
import {handleError,jsonError,rateGate} from '@/lib/api';
const allowed=rateGate(6,60000);
export async function POST(req:Request){try{
 const {user}=await requireUser();if(!user)return jsonError('Entre para enviar uma referência.',401);
 if(!allowed(user.id))return jsonError('Aguarde um minuto antes de enviar outra foto.',429);
 if(Number(req.headers.get('content-length')||0)>4*1024*1024)return jsonError('Use uma foto de até 3 MB.',413);
 const data=await req.formData(),file=data.get('file');
 if(!(file instanceof File)||file.size>3*1024*1024||file.size===0)return jsonError('Envie uma imagem JPG, PNG ou WebP de até 3 MB.',422);
 const bytes=Buffer.from(await file.arrayBuffer());
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!png&&!jpg&&!webp)return jsonError('Formato de imagem inválido.',422);
 const path=`${user.id}/references/${crypto.randomUUID()}.${png?'png':jpg?'jpg':'webp'}`;
 const r=await adminDb().storage.from('creations').upload(path,bytes,{contentType:png?'image/png':jpg?'image/jpeg':'image/webp'});if(r.error)throw r.error;
 return NextResponse.json({path});
 }catch(e){return handleError(e)}}
