-- VEOX IA 2.0 / Phase 1. Additive migration; preserves existing influencers, jobs and assets.
-- IMPORTANT: review on a staging Supabase before production.
create table if not exists public.user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','user')) default 'user',
 created_at timestamptz not null default now()
);
create table if not exists public.generation_models (
 id text primary key, provider text not null, kind text not null check(kind in ('image','video','edit')),
 display_name text not null, enabled boolean not null default false,
 supports_audio boolean not null default false, verified_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.model_pricing (
 model_id text primary key references public.generation_models(id) on delete restrict,
 credit_price bigint not null check(credit_price>0),
 estimated_brl numeric(15,6) not null check(estimated_brl>=0),
 margin_target numeric(6,5) not null check(margin_target>=0 and margin_target<1),
 verified_at timestamptz not null,
 enabled boolean not null default false
);
create table if not exists public.credit_reservations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 job_id uuid not null unique references public.generation_jobs(id),
 amount bigint not null check(amount>0),
 state text not null check(state in ('held','captured','released')) default 'held',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.topup_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 amount_brl numeric(12,2) not null check(amount_brl>0),credits bigint not null check(credits>0),
 status text not null check(status in ('pending','paid','cancelled','refunded')) default 'pending',
 payment_provider text not null default 'mercadopago',
 external_reference text unique,
 created_at timestamptz not null default now(),paid_at timestamptz
);
create table if not exists public.payment_events (
 event_id text primary key,provider text not null,payload jsonb not null,
 processed_at timestamptz not null default now()
);
create table if not exists public.provider_budget (
 provider text primary key,
 daily_limit_brl numeric(12,2) not null default 0,
 monthly_limit_brl numeric(12,2) not null default 0,
 disabled boolean not null default true,
 updated_at timestamptz not null default now()
);
create table if not exists public.generation_costs (
 job_id uuid primary key references public.generation_jobs(id),provider text not null,
 external_task_id text unique,currency text not null default 'USD',
 cost_actual numeric(14,6), cost_estimate numeric(14,6),
 reconciled boolean not null default false,created_at timestamptz not null default now()
);
create table if not exists public.user_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 max_daily_images integer not null default 30 check(max_daily_images>=0),
 max_daily_videos integer not null default 10 check(max_daily_videos>=0),
 max_daily_swaps integer not null default 5 check(max_daily_swaps>=0),
 max_concurrent integer not null default 2 check(max_concurrent>=0)
);
create index if not exists ix_topup_user_created on public.topup_orders(user_id,created_at desc);
create index if not exists ix_res_user_state on public.credit_reservations(user_id,state);
create index if not exists ix_cost_reconcile on public.generation_costs(reconciled) where reconciled=false;
-- Read access via RLS; financial/admin writes must ONLY happen in trusted backend RPC/service role.
alter table public.user_roles enable row level security;
alter table public.generation_models enable row level security;
alter table public.model_pricing enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.topup_orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.provider_budget enable row level security;
alter table public.generation_costs enable row level security;
alter table public.user_limits enable row level security;
create policy "v2 user own role read" on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
create policy "v2 published model catalog read" on public.generation_models for select to authenticated using(enabled=true);
create policy "v2 user own reservations read" on public.credit_reservations for select to authenticated using(user_id=(select auth.uid()));
create policy "v2 user own topups read" on public.topup_orders for select to authenticated using(user_id=(select auth.uid()));
create policy "v2 user own limits read" on public.user_limits for select to authenticated using(user_id=(select auth.uid()));
insert into public.provider_budget(provider) values ('byteplus') on conflict(provider) do nothing;
insert into public.generation_models(id,provider,kind,display_name) values
 ('seedream-5-0-lite-260128','byteplus','image','Seedream 5 Lite'),
 ('seedance-1-5-pro-251215','byteplus','video','Seedance 1.5 Pro'),
 ('dreamina-seedance-2-0-260128','byteplus','video','Seedance 2.0'),
 ('dreamina-seedance-2-5-260628','byteplus','video','Seedance 2.5')
on conflict(id) do nothing;
-- No admin inserted from a mutable profile/email field. Grant role manually only after UID verification.
-- No models enabled and budget disabled by design: prevents surprise charges.
