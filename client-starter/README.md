# SiteSync Client Starter Template

Use this checklist for every new client project.

## Required project record

- Client and business name
- Primary domain and registrar
- GitHub repository owner/name
- Netlify project name and production branch
- Supabase project and region, when durable data is required
- Approved brand colors, fonts, logo files, and voice
- Package scope and separately billed third-party services
- Launch owner and support term

## Delivery gates

1. **Discover** — confirm goals, audience, pages, integrations, domain, content, and access.
2. **Build** — create responsive, accessible pages using client-approved brand assets.
3. **Connect** — configure forms, analytics, platform handoffs, and durable storage.
4. **Verify** — run automated checks, mobile/desktop review, form submission, database receipt, and broken-link checks.
5. **Preview** — review a Netlify deploy preview before production.
6. **Launch** — merge the approved change, verify the custom domain and HTTPS, and repeat the form test.
7. **Handoff** — record ownership, renewals, third-party costs, support term, and next review date.

## Repository baseline

- `main` is production.
- New work uses pull requests and deploy previews.
- Secrets live in Netlify/Supabase settings, never GitHub.
- Every form has server-side validation, spam protection, a durable destination, and a tested success/error state.
- Each project includes `.env.example`, `netlify.toml`, database migrations, a README, and a verification command.

## Scope rule

SiteSync package prices cover SiteSync labor only. Domains, hosting, email, ads, subscriptions, platform fees, software licenses, and other third-party products are paid separately by the client. Work beyond the defined package requires a consultation and custom quote.
