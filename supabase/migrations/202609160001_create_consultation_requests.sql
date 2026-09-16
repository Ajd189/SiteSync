create extension if not exists pgcrypto;

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  business text not null check (char_length(business) between 1 and 150),
  email text not null check (char_length(email) <= 254),
  phone text not null default 'Not provided',
  website text not null default 'Not provided',
  selected_package text not null,
  budget text not null default 'Let’s discuss',
  goals text not null check (char_length(goals) between 10 and 5000),
  platforms text[] not null default '{}',
  extended_support boolean not null default false,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  source text not null default 'website',
  user_agent text
);

create index if not exists consultation_requests_created_at_idx on public.consultation_requests (created_at desc);
alter table public.consultation_requests enable row level security;

-- No public policies: browser clients cannot read or write leads. The Netlify
-- function writes through the server-only service role key.
revoke all on public.consultation_requests from anon, authenticated;
grant select, insert, update, delete on public.consultation_requests to service_role;
