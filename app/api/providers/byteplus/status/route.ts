import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/supabase-server';
export const runtime='nodejs';
export async function GET(){
 const {user}=await requireUser();if(!user)return NextResponse.json({error:'Não autorizado'},{status:401});
 return NextResponse.json({provider:'byteplus',configured:Boolean(process.env.BYTEPLUS_API_KEY),enabled:process.env.BYTEPLUS_GENERATION_ENABLED==='true',note:'Integração real bloqueada até configuração de precificação, orçamento, pagamentos e worker. Nenhuma chamada paga é feita aqui.'});
}
