import 'server-only';
import {adminDb} from './supabase-admin';
import {imageQuote, type Pricing} from './pricing';
export async function getPricing(){
 const {data,error}=await adminDb().from('veox_settings').select('pricing').eq('id',1).single();
 if(error||!data)throw Error('A configuração do estúdio está incompleta. Entre em contato com o suporte.');
 return data.pricing as Pricing;
}
export async function getQuote(){const pricing=await getPricing();return {pricing,quote:imageQuote(pricing)}}
