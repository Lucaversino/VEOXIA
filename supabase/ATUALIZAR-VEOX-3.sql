-- Executar APÓS 001_init.sql, 003_v2_foundations.sql e 004_admin_credits.sql.
-- Não apaga personagens, arquivos nem saldos. Execute no projeto VEOX.
begin;
grant usage on schema public to authenticated, service_role;
grant select,insert,update,delete on public.influencers to authenticated;
grant select on public.assets,public.generation_jobs,public.credit_wallets,public.credit_transactions,public.voice_catalog to authenticated;
revoke insert,update,delete on public.generation_jobs,public.assets,public.credit_wallets,public.credit_transactions from anon,authenticated;
grant all on public.influencers,public.assets,public.generation_jobs,public.credit_wallets,public.credit_transactions,public.audit_logs to service_role;
grant usage,select on all sequences in schema public to service_role;
alter table public.influencers add column if not exists reference_path text;
alter table public.influencers drop constraint if exists veox_reference_owner;
alter table public.influencers add constraint veox_reference_owner check(reference_path is null or reference_path ~ ('^'||user_id::text||'/references/[0-9a-f-]{36}\.(png|jpg|webp)$'));
create table if not exists public.veox_settings(id int primary key check(id=1),pricing jsonb not null);
alter table public.veox_settings enable row level security;
revoke all on public.veox_settings from anon,authenticated;
grant all on public.veox_settings to service_role;
insert into public.veox_settings values(1,'{"image_usd":0,"usd_brl":0,"overhead_brl":0.02,"fee_percent":10,"safety_percent":20,"credit_brl":0.10,"valid_until":"2020-01-01T00:00:00Z","public_enabled":false,"daily_limit":20,"daily_budget_brl":20}') on conflict do nothing;
create table if not exists public.veox_requests(
 id uuid primary key,user_id uuid not null references auth.users(id),job_id uuid unique references public.generation_jobs(id),
 fingerprint text not null,credits bigint not null check(credits>0),cost_brl numeric not null check(cost_brl>0),
 state text not null default 'reserved' check(state in('reserved','submitted','completed','refunded','review')),
 created_at timestamptz not null default now());
create index if not exists veox_requests_user_date on public.veox_requests(user_id,created_at);
alter table public.veox_requests enable row level security;
revoke all on public.veox_requests from anon,authenticated;
grant all on public.veox_requests to service_role;
-- Restricted invoker functions: clients cannot mint credits or invoke billing.
create or replace function public.veox_credit_change(p_user uuid,p_delta bigint,p_reason text,p_external text)
returns bigint language plpgsql security invoker set search_path=public as $$
declare v_balance bigint; v_tx public.credit_transactions;
begin
 if p_delta is null or p_delta=0 or abs(p_delta)>100000000 then raise exception 'Invalid amount'; end if;
 if p_external is null or length(p_external)<5 or p_reason is null or length(p_reason)<3 then raise exception 'Invalid operation'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_external,0));
 select * into v_tx from public.credit_transactions where external_id=p_external;
 if found then
  if v_tx.user_id<>p_user or v_tx.delta<>p_delta then raise exception 'Operation mismatch'; end if;
  select balance into v_balance from public.credit_wallets where user_id=p_user; return v_balance;
 end if;
 insert into public.credit_wallets(user_id,balance) values(p_user,0) on conflict do nothing;
 update public.credit_wallets set balance=balance+p_delta,updated_at=now() where user_id=p_user and balance+p_delta>=0 returning balance into v_balance;
 if not found then raise exception 'Insufficient credits'; end if;
 insert into public.credit_transactions(user_id,delta,reason,external_id) values(p_user,p_delta,p_reason,p_external);
 return v_balance;
end;$$;
create or replace function public.veox_reserve(p_id uuid,p_user uuid,p_character uuid,p_fingerprint text,p_credits bigint,p_cost numeric,p_payload jsonb,p_daily int,p_budget numeric)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.veox_requests; j uuid; n bigint; spent numeric;
begin
 -- Global lock serializes the budget across all server instances and users.
 perform pg_advisory_xact_lock(761039);
 select * into r from public.veox_requests where id=p_id;
 if found then
  if r.user_id<>p_user or r.fingerprint<>p_fingerprint then raise exception 'Operation mismatch'; end if;
  return jsonb_build_object('fresh',false,'jobId',r.job_id,'state',r.state);
 end if;
 if p_credits<=0 or p_cost<=0 or p_daily<1 or p_budget<=0 then raise exception 'Invalid pricing'; end if;
 if not exists(select 1 from public.influencers where id=p_character and user_id=p_user) then raise exception 'Character not found'; end if;
 if exists(select 1 from public.veox_requests where user_id=p_user and state in('reserved','submitted','review')) then raise exception 'Generation pending'; end if;
 select count(*) into n from public.veox_requests where user_id=p_user and created_at>=date_trunc('day',now());
 if n>=p_daily then raise exception 'Daily limit'; end if;
 select coalesce(sum(cost_brl),0) into spent from public.veox_requests where created_at>=date_trunc('day',now());
 if spent+p_cost>p_budget then raise exception 'Daily budget'; end if;
 perform public.veox_credit_change(p_user,-p_credits,'Geração de imagem','generate:'||p_id);
 insert into public.generation_jobs(user_id,influencer_id,type,status,payload) values(p_user,p_character,'image','processing',p_payload) returning id into j;
 insert into public.veox_requests(id,user_id,job_id,fingerprint,credits,cost_brl) values(p_id,p_user,j,p_fingerprint,p_credits,p_cost);
 return jsonb_build_object('fresh',true,'jobId',j,'state','reserved');
end;$$;
create or replace function public.veox_refund(p_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare r public.veox_requests;
begin
 select * into r from public.veox_requests where id=p_id for update;
 if not found or r.state='refunded' then return; end if;
 if r.state not in('reserved','review') then raise exception 'Reconciliation required'; end if;
 perform public.veox_credit_change(r.user_id,r.credits,'Estorno de geração','refund:'||p_id);
 update public.veox_requests set state='refunded' where id=p_id;
 update public.generation_jobs set status='failed',error_message='A geração não foi concluída. Créditos devolvidos.',completed_at=now() where id=r.job_id;
end;$$;
revoke all on function public.veox_credit_change(uuid,bigint,text,text),public.veox_reserve(uuid,uuid,uuid,text,bigint,numeric,jsonb,int,numeric),public.veox_refund(uuid) from public,anon,authenticated;
grant execute on function public.veox_credit_change(uuid,bigint,text,text),public.veox_reserve(uuid,uuid,uuid,text,bigint,numeric,jsonb,int,numeric),public.veox_refund(uuid) to service_role;
-- Completa até 100 uma única vez, preservando saldo maior e sem recarga a cada login.
do $$ declare u uuid; b bigint; begin
 select id into u from auth.users where lower(email)='brendaelucas.765@gmail.com' and email_confirmed_at is not null;
 if u is not null and not exists(select 1 from public.audit_logs where action='admin_initial_100_v3' and user_id=u) then
  insert into public.credit_wallets(user_id,balance) values(u,0) on conflict do nothing;
  select balance into b from public.credit_wallets where user_id=u for update;
  if b<100 then
   update public.credit_wallets set balance=100,updated_at=now() where user_id=u;
   insert into public.credit_transactions(user_id,delta,reason,external_id) values(u,100-b,'Saldo de teste do administrador','initial100v3:'||u);
  end if;
  insert into public.audit_logs(user_id,action) values(u,'admin_initial_100_v3');
 end if;
end $$;
create or replace function public.veox_reconcile(p_id uuid,p_action text,p_admin uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare r public.veox_requests;
begin
 select * into r from public.veox_requests where id=p_id for update;
 if not found or r.state not in('reserved','submitted','review') then raise exception 'Already resolved'; end if;
 if r.created_at>now()-interval '10 minutes' then raise exception 'Still processing'; end if;
 if p_action='refund' then
  update public.veox_requests set state='review' where id=p_id;
  perform public.veox_refund(p_id);
 elsif p_action='complete' then
  if not exists(select 1 from public.assets where job_id=r.job_id and user_id=r.user_id) then raise exception 'File not saved'; end if;
  update public.veox_requests set state='completed' where id=p_id;
  update public.generation_jobs set status='completed',error_message=null,completed_at=now() where id=r.job_id;
 else raise exception 'Invalid action'; end if;
 insert into public.audit_logs(user_id,action,metadata) values(p_admin,'generation_reconciled',jsonb_build_object('request_id',p_id,'action',p_action,'cost_brl',r.cost_brl));
end;$$;
revoke all on function public.veox_reconcile(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.veox_reconcile(uuid,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
