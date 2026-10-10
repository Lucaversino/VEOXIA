import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export const jsonError=(message:string,status=400)=>NextResponse.json({error:message},{status});
export const handleError=(error:unknown)=>{if(error instanceof ZodError)return jsonError(error.issues.map(i=>i.message).join('; '),422);console.error('API failure',error);return jsonError('Não foi possível concluir. Tente novamente.',500)};
export function rateGate(limit:number,windowMs:number){const globalStore=globalThis as typeof globalThis & {__rateGate?:Map<string,{count:number,until:number}>};const store=globalStore.__rateGate??=new Map();return (key:string)=>{const now=Date.now();if(store.size>5000)for(const [k,v] of store)if(v.until<now)store.delete(k);const v=store.get(key);if(!v||v.until<now){store.set(key,{count:1,until:now+windowMs});return true}v.count++;return v.count<=limit};}
