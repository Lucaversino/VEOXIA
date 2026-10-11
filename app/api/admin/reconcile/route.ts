import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/admin-access';
import {adminDb} from '@/lib/supabase-admin';
import {jsonError,handleError} from '@/lib/api';
const Body=z.object({requestId:z.string().uuid(),action:z.enum(['refund','complete']),confirmed:z.literal(true)});
export async function GET(){if(!(await requireAdmin()).isAdmin)return jsonError('Acesso negado.',403);try{const {data,error}=await adminDb().from('veox_requests').select('*').in('state',['review','reserved','submitted']).order('created_at');if(error)throw error;return NextResponse.json({items:data})}catch(e){return handleError(e)}}
export async function POST(req:Request){const s=await requireAdmin();if(!s.isAdmin)return jsonError('Acesso negado.',403);try{
 const input=Body.parse(await req.json());const db=adminDb();
 const {data:r,error}=await db.from('veox_requests').select('*').eq('id',input.requestId).single();if(error||!r)return jsonError('Solicitação não encontrada.',404);
 if(!['review','reserved','submitted'].includes(r.state))return jsonError('Essa solicitação já foi resolvida.',409);
 if(Date.now()-Date.parse(r.created_at)<10*60000)return jsonError('Aguarde pelo menos 10 minutos para evitar conflito com uma geração em andamento.',409);
 // Serializes reconciliation against other administrator requests.
 const {error:resolveError}=await db.rpc('veox_reconcile',{p_id:r.id,p_action:input.action,p_admin:s.user!.id});if(resolveError)throw resolveError;
 return NextResponse.json({ok:true});
 }catch(e){return handleError(e)}}
