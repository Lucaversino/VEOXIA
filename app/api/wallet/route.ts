import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/supabase-server';
import {getPricing} from '@/lib/billing';
import {imageQuote} from '@/lib/pricing';
import {handleError,jsonError} from '@/lib/api';
export async function GET(){try{
 const {user,db}=await requireUser();if(!user||!db)return jsonError('Entre para consultar seus créditos.',401);
 const [wallet,ledger]=await Promise.all([db.from('credit_wallets').select('balance').eq('user_id',user.id).maybeSingle(),db.from('credit_transactions').select('id,delta,reason,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30)]);
 if(wallet.error||ledger.error)throw wallet.error||ledger.error;
 let quote=null,note='';try{quote=imageQuote(await getPricing())}catch(e){note=(e as Error).message}
 return NextResponse.json({balance:wallet.data?.balance??0,transactions:ledger.data,quote,note},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return handleError(e)}}
