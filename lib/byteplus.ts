// BytePlus ModelArk: requests only from trusted server runtimes.
// Provider is deliberately non-billing: caller must reserve credits and budgets first.
import { z } from 'zod';
const base = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const VIDEO_MODELS = {
  'seedance-1-5-pro-251215': { min:4, max:12, resolutions:['480p','720p','1080p'] as const },
  'dreamina-seedance-2-0-260128': { min:4, max:15, resolutions:['480p','720p','1080p'] as const },
  'dreamina-seedance-2-5-260628': { min:4, max:30, resolutions:['480p','720p','1080p'] as const },
} as const;
export const videoRequestSchema=z.object({
  model:z.enum(['seedance-1-5-pro-251215','dreamina-seedance-2-0-260128','dreamina-seedance-2-5-260628']),
  prompt:z.string().trim().min(10).max(1800),
  duration:z.number().int().min(4).max(30),
  resolution:z.enum(['480p','720p','1080p']),
  ratio:z.enum(['9:16','16:9','1:1','adaptive']).default('9:16'),
  referenceImage:z.string().url().optional(),
  generateAudio:z.boolean().default(false),
}).superRefine((input,ctx)=>{
  const limits=VIDEO_MODELS[input.model];
  if(input.duration<limits.min||input.duration>limits.max)ctx.addIssue({code:'custom',message:'Duração não suportada pelo modelo',path:['duration']});
  if(!(limits.resolutions as readonly string[]).includes(input.resolution))ctx.addIssue({code:'custom',message:'Resolução não suportada',path:['resolution']});
});
export type VideoInput=z.infer<typeof videoRequestSchema>;
export const IMAGE_MODEL='seedream-5-0-lite-260128';
export const imageRequestSchema=z.object({prompt:z.string().trim().min(10).max(1800),size:z.enum(['2K','4K']).default('2K'),referenceImage:z.string().url().optional()});
function apiKey(){const key=process.env.BYTEPLUS_API_KEY;if(!key)throw Error('BYTEPLUS_API_KEY ausente no servidor');return key}
async function request<T>(path:string,method:'POST'|'GET', body?:unknown):Promise<T>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
 try{
  const res=await fetch(base+path,{method,headers:{Authorization:`Bearer ${apiKey()}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:controller.signal});
  const raw=await res.text();let parsed:unknown;try{parsed=JSON.parse(raw)}catch{throw Error(`BytePlus respondeu fora de JSON (HTTP ${res.status})`)}
  if(!res.ok){const detail=parsed as {error?:{message?:string};message?:string};throw Error(`BytePlus HTTP ${res.status}: ${detail.error?.message||detail.message||'Solicitação recusada'}`)}
  return parsed as T;
 }finally{clearTimeout(timer)}
}
export class BytePlusProvider {
 // WARNING: These methods incur real provider charges. Never call directly from an unpriced route.
 async createVideo(value:VideoInput):Promise<{id:string}>{
  const i=videoRequestSchema.parse(value);
  const content:[{type:'text';text:string},...Array<{type:'image_url';image_url:{url:string};role:'first_frame'}>] = [{type:'text',text:i.prompt}];
  if(i.referenceImage)content.push({type:'image_url',image_url:{url:i.referenceImage},role:'first_frame'});
  return request('/contents/generations/tasks','POST',{model:i.model,content,duration:i.duration,resolution:i.resolution,ratio:i.referenceImage?'adaptive':i.ratio,generate_audio:i.generateAudio});
 }
 async getVideo(id:string):Promise<{id:string;status:string;content?:{video_url?:string};error?:unknown}>{
  if(!/^[\w-]{5,128}$/.test(id))throw Error('Identificador inválido');
  return request('/contents/generations/tasks/'+encodeURIComponent(id),'GET');
 }
 async createImage(value:z.infer<typeof imageRequestSchema>):Promise<{data:Array<{url?:string;b64_json?:string}>;usage?:unknown}>{
  const i=imageRequestSchema.parse(value);
  return request('/images/generations','POST',{model:IMAGE_MODEL,prompt:i.prompt,size:i.size,output_format:'png',watermark:false,...(i.referenceImage?{image:i.referenceImage}:{})});
 }
}
