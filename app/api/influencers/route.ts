import { NextResponse } from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/supabase-server';
import {handleError,jsonError} from '@/lib/api';
const Schema=z.object({name:z.string().trim().min(2).max(70),style:z.enum(['Realista','Cinematográfico','Editorial','Anime','3D','Fantasia']),description:z.string().trim().max(1200).default(''),vibe:z.string().max(40).default('Criativo')});
export async function GET(){try{const {db,user,error}=await requireUser();if(!db||!user)return jsonError(error||'Não autorizado',401);const {data,error:err}=await db.from('influencers').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(err)throw err;return NextResponse.json({items:data})}catch(e){return handleError(e)}}
export async function POST(req:Request){try{const {db,user,error}=await requireUser();if(!db||!user)return jsonError(error||'Não autorizado',401);const input=Schema.parse(await req.json());const {data,error:err}=await db.from('influencers').insert({...input,user_id:user.id}).select().single();if(err)throw err;return NextResponse.json({item:data},{status:201})}catch(e){return handleError(e)}}
