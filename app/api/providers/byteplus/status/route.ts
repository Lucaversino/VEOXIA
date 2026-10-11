import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/admin-access';
import {getQuote} from '@/lib/billing';
export async function GET(){if(!(await requireAdmin()).isAdmin)return NextResponse.json({error:'Acesso negado.'},{status:403});let pricingReady=false;try{await getQuote();pricingReady=true}catch{}return NextResponse.json({configured:Boolean(process.env.BYTEPLUS_API_KEY||process.env.BYTEPLUS_MODELARK_API_KEY),enabled:process.env.BYTEPLUS_GENERATION_ENABLED==='true',pricingReady,videoEnabled:false},{headers:{'Cache-Control':'no-store'}})}
