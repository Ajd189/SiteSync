# SiteSync

SiteSync's production website and the reference implementation for future client projects.

## Managed workflow

1. Work in a feature branch and open a pull request.
2. Netlify creates a deploy preview for review.
3. Merge to `main` only after `npm run check` passes.
4. Netlify deploys `main` to production.
5. Consultation requests are validated by a Netlify Function and stored in Supabase with public access disabled.

## Local setup

```bash
npm install
npm run dev
npm run check
```

Copy `.env.example` to `.env` for local function testing. Never commit the Supabase service role key.

## Production variables

- `PUBLIC_SITE_URL=https://sitesync.us.com`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (Functions scope only)
- `SITESYNC_FORM_KEY` (secret; Functions/runtime scope only)

Apply `supabase/migrations/202609160001_create_consultation_requests.sql` before enabling the form in production.

## Client starter

The `client-starter/` directory contains the reusable operating checklist and baseline configuration used for new SiteSync clients.
