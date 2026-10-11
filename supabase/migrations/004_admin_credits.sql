-- Run once in Supabase SQL Editor. All changes are atomic and ledger-backed.
create or replace function public.veox_credit_change(p_user uuid,p_delta bigint,p_reason text,p_external text)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
 if auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
 if p_delta=0 or abs(p_delta)>100000000 then raise exception 'Invalid amount'; end if;
 if length(p_reason)<3 or length(p_external)<5 then raise exception 'Invalid operation'; end if;
 insert into public.credit_wallets(user_id,balance) values(p_user,0) on conflict do nothing;
 -- an exact duplicate must not create any additional balance changes
 if exists(select 1 from public.credit_transactions where external_id=p_external) then
  select balance into v_balance from public.credit_wallets where user_id=p_user;
  return v_balance;
 end if;
 update public.credit_wallets set balance=balance+p_delta,updated_at=now()
 where user_id=p_user and balance+p_delta>=0 returning balance into v_balance;
 if not found then raise exception 'Insufficient credits'; end if;
 insert into public.credit_transactions(user_id,delta,reason,external_id) values(p_user,p_delta,p_reason,p_external);
 return v_balance;
end;$$;
revoke all on function public.veox_credit_change(uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.veox_credit_change(uuid,bigint,text,text) to service_role;
