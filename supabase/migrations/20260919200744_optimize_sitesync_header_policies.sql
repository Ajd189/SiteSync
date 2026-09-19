-- Resolve the server-held request key once per statement instead of once per
-- row. Keeping header parsing inside a private helper also makes every policy
-- use the same check.

create or replace function private.sitesync_request_has_form_key()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.valid_sitesync_form_key(
    coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
  );
$$;

revoke all on function private.sitesync_request_has_form_key() from public;
grant usage on schema private to anon;
grant execute on function private.sitesync_request_has_form_key() to anon;

drop policy if exists "server form may insert consultations" on public.consultation_requests;
create policy "server form may insert consultations"
  on public.consultation_requests
  for insert
  to anon
  with check ((select private.sitesync_request_has_form_key()));

drop policy if exists "server inbox may read SiteSync leads" on public.sitesync_leads;
create policy "server inbox may read SiteSync leads"
  on public.sitesync_leads
  for select
  to anon
  using ((select private.sitesync_request_has_form_key()));

drop policy if exists "server inbox may update SiteSync leads" on public.sitesync_leads;
create policy "server inbox may update SiteSync leads"
  on public.sitesync_leads
  for update
  to anon
  using ((select private.sitesync_request_has_form_key()))
  with check ((select private.sitesync_request_has_form_key()));

drop policy if exists "server inbox may read consultations" on public.consultation_requests;
create policy "server inbox may read consultations"
  on public.consultation_requests
  for select
  to anon
  using ((select private.sitesync_request_has_form_key()));

drop policy if exists "server inbox may update consultations" on public.consultation_requests;
create policy "server inbox may update consultations"
  on public.consultation_requests
  for update
  to anon
  using ((select private.sitesync_request_has_form_key()))
  with check ((select private.sitesync_request_has_form_key()));

drop policy if exists "server inbox may read agent runs" on public.sitesync_agent_runs;
create policy "server inbox may read agent runs"
  on public.sitesync_agent_runs
  for select
  to anon
  using ((select private.sitesync_request_has_form_key()));
