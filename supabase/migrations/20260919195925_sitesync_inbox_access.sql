-- Allow the owner-only Netlify inbox function to read and update workflow data
-- with the same server-held form key used by the consultation endpoint. RLS
-- still denies ordinary browser requests because they cannot provide that key.

grant select on public.sitesync_leads to anon;
grant update (
  stage,
  outreach_draft,
  follow_up_draft,
  last_contact,
  next_follow_up,
  notes,
  do_not_contact,
  updated_at
) on public.sitesync_leads to anon;

grant select on public.consultation_requests to anon;
grant update (
  status,
  priority,
  response_draft,
  last_contact,
  next_follow_up,
  notes,
  agent_reviewed_at
) on public.consultation_requests to anon;

grant select on public.sitesync_agent_runs to anon;

drop policy if exists "server inbox may read SiteSync leads" on public.sitesync_leads;
create policy "server inbox may read SiteSync leads"
  on public.sitesync_leads
  for select
  to anon
  using (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  );

drop policy if exists "server inbox may update SiteSync leads" on public.sitesync_leads;
create policy "server inbox may update SiteSync leads"
  on public.sitesync_leads
  for update
  to anon
  using (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  )
  with check (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  );

drop policy if exists "server inbox may read consultations" on public.consultation_requests;
create policy "server inbox may read consultations"
  on public.consultation_requests
  for select
  to anon
  using (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  );

drop policy if exists "server inbox may update consultations" on public.consultation_requests;
create policy "server inbox may update consultations"
  on public.consultation_requests
  for update
  to anon
  using (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  )
  with check (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  );

drop policy if exists "server inbox may read agent runs" on public.sitesync_agent_runs;
create policy "server inbox may read agent runs"
  on public.sitesync_agent_runs
  for select
  to anon
  using (
    (select private.valid_sitesync_form_key(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-sitesync-form-key', '')
    ))
  );
