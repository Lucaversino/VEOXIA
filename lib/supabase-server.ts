import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { configured } from './supabase-config';
export async function serverDb(){if(!configured()) throw new Error('Supabase não configurado.');const store=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return store.getAll()},setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{ /* server component is read only */ }}}});}
export async function requireUser(){if(!configured()) return {error:'Configure as variáveis do Supabase.',db:null,user:null};const db=await serverDb();const {data:{user},error}=await db.auth.getUser();return {db,user,error:error?.message ?? (!user?'Entre com sua conta para continuar.':null)};}
