import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const browserDb = () => {if(!configured()) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)};
export async function serverDb(){if(!configured()) throw new Error('Supabase não configurado.');const store=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return store.getAll()},setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{ /* server component is read only */ }}}});}
export async function requireUser(){if(!configured()) return {error:'Configure as variáveis do Supabase.',db:null,user:null};const db=await serverDb();const {data:{user},error}=await db.auth.getUser();return {db,user,error:error?.message ?? (!user?'Entre com sua conta para continuar.':null)};}
