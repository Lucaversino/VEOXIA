import {readFileSync,existsSync} from 'node:fs';import {test} from 'node:test';import {strict as assert} from 'node:assert';
const root=process.cwd();const r=p=>readFileSync(root+'/'+p,'utf8');
test('arquivos necessários presentes',()=>['app/page.tsx','app/layout.tsx','middleware.ts','supabase/migrations/001_init.sql','app/api/voice/route.ts','workers/worker.py'].forEach(f=>assert.ok(existsSync(root+'/'+f),f)));
test('fish token somente no backend',()=>{assert.ok(!r('app/page.tsx').includes('FISH_AUDIO_API_KEY'));assert.ok(r('app/api/voice/route.ts').includes('process.env.FISH_AUDIO_API_KEY'))});
test('RLS habilitada nas tabelas de identidade',()=>{const sql=r('supabase/migrations/001_init.sql');assert.match(sql,/alter table public.influencers enable row level security/);assert.match(sql,/alter table public.generation_jobs enable row level security/) });
test('nenhuma promessa de 4K nativo',()=>assert.match(r('app/page.tsx'),/não resolução nativa garantida/));
