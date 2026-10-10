-- Execute no SQL Editor do Supabase antes de iniciar a aplicação.
create extension if not exists pgcrypto;
create table if not exists public.influencers(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null check(length(name) between 2 and 70),style text not null,description text not null default '',vibe text not null default 'Criativo',created_at timestamptz not null default now());
create table if not exists public.voice_catalog(id uuid primary key default gen_random_uuid(),name text not null,description text default '',language text not null default 'pt-BR',reference_id text not null unique,enabled boolean not null default false,commercial_allowed boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.generation_jobs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,influencer_id uuid not null references public.influencers(id) on delete cascade,type text not null check(type in ('image','video')),status text not null default 'queued' check(status in ('queued','processing','completed','failed')),payload jsonb not null default '{}',error_message text,attempts int not null default 0,created_at timestamptz not null default now(),completed_at timestamptz);
create index if not exists ix_jobs_user_created on public.generation_jobs(user_id,created_at desc);
create index if not exists ix_jobs_worker on public.generation_jobs(status,created_at) where status='queued';
create table if not exists public.assets(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,influencer_id uuid references public.influencers(id) on delete set null,job_id uuid references public.generation_jobs(id) on delete set null,kind text not null check(kind in ('image','video','audio','reference')),storage_path text not null,created_at timestamptz not null default now());
create index if not exists ix_assets_user on public.assets(user_id,created_at desc);
create table if not exists public.credit_wallets(user_id uuid primary key references auth.users(id) on delete cascade,balance bigint not null default 0 check(balance>=0),updated_at timestamptz not null default now());
create table if not exists public.credit_transactions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,delta bigint not null,reason text not null,external_id text unique,created_at timestamptz not null default now());
create table if not exists public.audit_logs(id bigint generated always as identity primary key,user_id uuid references auth.users(id) on delete set null,action text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
-- ALL tables: RLS; credit wallets and transactions are read-only for end users
alter table public.influencers enable row level security;
alter table public.voice_catalog enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.assets enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.audit_logs enable row level security;
create policy "own influencers read" on public.influencers for select to authenticated using (user_id=(select auth.uid()));
create policy "own influencers insert" on public.influencers for insert to authenticated with check (user_id=(select auth.uid()));
create policy "own influencers update" on public.influencers for update to authenticated using (user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "own influencers delete" on public.influencers for delete to authenticated using (user_id=(select auth.uid()));
create policy "licensed voices readable" on public.voice_catalog for select to authenticated using (enabled=true and commercial_allowed=true);
create policy "own jobs read" on public.generation_jobs for select to authenticated using (user_id=(select auth.uid()));
create policy "own jobs insert" on public.generation_jobs for insert to authenticated with check(user_id=(select auth.uid()) and status='queued' and exists(select 1 from public.influencers i where i.id=influencer_id and i.user_id=(select auth.uid())));
create policy "own assets read" on public.assets for select to authenticated using(user_id=(select auth.uid()));
create policy "own wallets read" on public.credit_wallets for select to authenticated using(user_id=(select auth.uid()));
create policy "own transactions read" on public.credit_transactions for select to authenticated using(user_id=(select auth.uid()));
-- Private bucket. Uploads/writes belong exclusively to backend with service key.
insert into storage.buckets(id,name,public,file_size_limit) values('creations','creations',false,104857600) on conflict(id) do nothing;
create policy "read own creations" on storage.objects for select to authenticated using(bucket_id='creations' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Job's completion and credit billing are server-only. Never grant client UPDATE on jobs, assets or balances.
