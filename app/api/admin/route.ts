import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/admin-access';
import {adminDb} from '@/lib/supabase-admin';
const inputSchema=z.object({userId:z.string().uuid(),amount:z.number().int().min(-1000000).max(1000000).refine(x=>x!==0),reason:z.string().trim().min(5).max(150),operationId:z.string().uuid()});
export async function GET(){
 const s=await requireAdmin();if(!s.isAdmin)return NextResponse.json({error:'Acesso negado'},{status:403});
 try{
 const db=adminDb();const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});if(ue)throw ue;
 const [wallets,ledger,jobs]=await Promise.all([
  db.from('credit_wallets').select('user_id,balance,updated_at'),
  db.from('credit_transactions').select('id,user_id,delta,reason,created_at').order('created_at',{ascending:false}).limit(100),
  db.from('generation_jobs').select('id,user_id,type,status,payload,created_at,completed_at').order('created_at',{ascending:false}).limit(300)
 ]);
 for(const r of [wallets,ledger,jobs])if(r.error)throw r.error;
 return NextResponse.json({users:users.users.map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,balance:wallets.data?.find(w=>w.user_id===u.id)?.balance||0})),transactions:ledger.data,jobs:jobs.data,usageNotice:'Tokens e custos da BytePlus só aparecem se coletados e persistidos por integração; histórico antigo não registra essas métricas.',hasMoreUsers:users.users.length===1000},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro administrativo'},{status:500});}
}
export async function POST(req:Request){
 const s=await requireAdmin();if(!s.isAdmin)return NextResponse.json({error:'Acesso negado'},{status:403});
 try{
 const input=inputSchema.parse(await req.json());const db=adminDb();
 const {data:target,error:targetError}=await db.auth.admin.getUserById(input.userId);
 if(targetError||!target.user)return NextResponse.json({error:'Usuário não encontrado'},{status:404});
 const {data:balance,error}=await db.rpc('veox_credit_change',{p_user:input.userId,p_delta:input.amount,p_reason:'ADMIN: '+input.reason,p_external:'admin:'+input.operationId});
 if(error)throw error;
 await db.from('audit_logs').insert({user_id:s.user!.id,action:'admin_credit_adjustment',metadata:{target_user_id:input.userId,delta:input.amount,reason:input.reason,operation_id:input.operationId}});
 return NextResponse.json({balance},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Falha na operação'},{status:400});}
}
