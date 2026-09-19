-- Private operating tables for the SiteSync lead-generation agents.
-- Browser roles receive no access; agents and trusted server-side code use
-- the service role or the Supabase management connection.

create extension if not exists pgcrypto;

create table if not exists public.sitesync_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  business_name text not null check (char_length(business_name) between 1 and 200),
  contact_name text,
  industry text,
  location text,
  website text,
  email text,
  phone text,
  source text not null default 'Public web',
  source_url text,
  stage text not null default 'New' check (
    stage in ('New', 'Qualified', 'Draft Ready', 'Contacted', 'Replied', 'Consultation', 'Proposal', 'Won', 'Lost', 'Disqualified')
  ),
  lead_score text check (lead_score in ('Hot', 'Warm', 'Cold')),
  fit_score integer check (fit_score between 0 and 100),
  need_signals text[] not null default '{}',
  recommended_package text check (
    recommended_package is null or recommended_package in (
      'Website Build — $249',
      'Connected Launch — $500',
      'Business Setup — $899',
      'Full SiteSync — $1,499',
      'Custom consultation'
    )
  ),
  outreach_draft text,
  follow_up_draft text,
  last_contact timestamptz,
  next_follow_up timestamptz,
  notes text,
  do_not_contact boolean not null default false,
  dedupe_key text not null unique
);

create index if not exists sitesync_leads_created_at_idx
  on public.sitesync_leads (created_at desc);
create index if not exists sitesync_leads_stage_score_idx
  on public.sitesync_leads (stage, lead_score, fit_score desc);
create index if not exists sitesync_leads_follow_up_idx
  on public.sitesync_leads (next_follow_up)
  where next_follow_up is not null and do_not_contact = false;

alter table public.sitesync_leads enable row level security;
revoke all on public.sitesync_leads from public, anon, authenticated;
grant select, insert, update, delete on public.sitesync_leads to service_role;

alter table public.consultation_requests
  add column if not exists priority text not null default 'Unreviewed'
    check (priority in ('Unreviewed', 'Hot', 'Warm', 'Cold')),
  add column if not exists agent_reviewed_at timestamptz,
  add column if not exists response_draft text,
  add column if not exists last_contact timestamptz,
  add column if not exists next_follow_up timestamptz,
  add column if not exists notes text;

create index if not exists consultation_requests_agent_queue_idx
  on public.consultation_requests (agent_reviewed_at, created_at desc);
create index if not exists consultation_requests_follow_up_idx
  on public.consultation_requests (next_follow_up)
  where next_follow_up is not null and status not in ('closed');

create table if not exists public.sitesync_agent_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_name text not null check (char_length(agent_name) between 1 and 100),
  status text not null check (status in ('success', 'no_change', 'error')),
  items_found integer not null default 0 check (items_found >= 0),
  items_changed integer not null default 0 check (items_changed >= 0),
  summary text,
  error text
);

create index if not exists sitesync_agent_runs_agent_created_idx
  on public.sitesync_agent_runs (agent_name, created_at desc);

alter table public.sitesync_agent_runs enable row level security;
revoke all on public.sitesync_agent_runs from public, anon, authenticated;
grant select, insert, update, delete on public.sitesync_agent_runs to service_role;
