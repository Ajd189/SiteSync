alter table public.consultation_requests
  add column if not exists digest_sent_at timestamptz;

create index if not exists consultation_requests_pending_digest_idx
  on public.consultation_requests (created_at)
  where digest_sent_at is null;

comment on column public.consultation_requests.digest_sent_at is
  'Time this consultation was included in a SiteSync owner email digest.';
