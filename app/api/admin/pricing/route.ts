import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdmin} from '@/lib/admin-access';
import {adminDb} from '@/lib/supabase-admin';
import {getPricing} from '@/lib/billing';
import {imageQuote} from '@/lib/pricing';
import {handleError,jsonError} from '@/lib/api';
const Schema=z.object({image_usd:z.number().positive().max(100),usd_brl:z.number().positive().max(100),overhead_brl:z.number().min(0).max(100),fee_percent:z.number().min(0).max(49),safety_percent:z.number().min(0).max(500),credit_brl:z.literal(0.10),valid_until:z.string().datetime(),public_enabled:z.boolean(),daily_limit:z.number().int().min(1).max(1000),daily_budget_brl:z.number().positive().max(10000)});
export async function GET(){if(!(await requireAdmin()).isAdmin)return jsonError('Acesso negado.',403);try{return NextResponse.json({pricing:await getPricing()})}catch(e){return handleError(e)}}
export async function POST(req:Request){const s=await requireAdmin();if(!s.isAdmin)return jsonError('Acesso negado.',403);try{
 const pricing=Schema.parse(await req.json());const quote=imageQuote(pricing);
 if(Date.parse(pricing.valid_until)>Date.now()+31*86400000)return jsonError('Revise os preços em até 31 dias.',422);
 const {error}=await adminDb().from('veox_settings').update({pricing}).eq('id',1);if(error)throw error;
 await adminDb().from('audit_logs').insert({user_id:s.user!.id,action:'pricing_updated',metadata:pricing});
 return NextResponse.json({pricing,quote});
 }catch(e){return handleError(e)}}
