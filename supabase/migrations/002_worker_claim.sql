-- Execute depois de 001_init.sql (seguro para múltiplos workers).
create or replace function public.claim_next_generation_job()
returns setof public.generation_jobs
language plpgsql security definer set search_path = public
as $$
begin
  return query
  with picked as (
    select id from public.generation_jobs
    where status = 'queued' and type = 'image'
    order by created_at asc
    for update skip locked limit 1
  )
  update public.generation_jobs j
  set status = 'processing', attempts = attempts + 1
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;
revoke all on function public.claim_next_generation_job() from public, anon, authenticated;
grant execute on function public.claim_next_generation_job() to service_role;
