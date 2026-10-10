import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('BytePlus authenticated server integration',()=>{let s=read('lib/byteplus.ts');assert.match(s,/Bearer \$\{apiKey\(\)\}/);assert.match(s,/videoRequestSchema/);assert.match(s,/images\/generations/);});
test('all billing models disabled until cost verified',()=>{let s=read('supabase/migrations/003_v2_foundations.sql');assert.match(s,/enabled boolean not null default false/);assert.match(s,/disabled boolean not null default true/);});
test('legacy influencer route preserved',()=>assert.ok(read('app/api/influencers/route.ts')));
test('byteplus route does not incur costs',()=>{const s=read('app/api/providers/byteplus/status/route.ts');assert.doesNotMatch(s,/\.createVideo\(|\.createImage\(/)});
