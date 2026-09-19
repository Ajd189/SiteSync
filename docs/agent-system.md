# SiteSync agent system

SiteSync uses a draft-first agent workflow. Agents may research public business
information, organize the private lead pipeline, review inbound consultations,
and prepare outreach. They do not send messages, publish content, change ad
spend, or contact prospects without owner approval.

## Data ownership

- Supabase project `SiteSync` is the system of record.
- `sitesync_leads` stores outbound prospects and draft outreach.
- `consultation_requests` stores inbound website leads and their review state.
- `sitesync_agent_runs` records agent outcomes for troubleshooting.
- All three tables are protected by RLS. Access is limited to the service role
  and trusted server requests carrying the private SiteSync form key; that key
  is never exposed to the browser.

## Agents

### Prospect Scout

Finds legitimate small U.S. businesses using public sources, starting with
contractors/home services, restaurants, salons/retail, and professional
services. It records verifiable need signals and source URLs, deduplicates
results, and never gathers private personal data.

### Lead Qualifier

Reviews new prospects, assigns a 0–100 fit score and Hot/Warm/Cold rating, and
recommends the smallest package that fits the documented need. It must use the
published package scope and keep domain, hosting, email, software,
subscriptions, ad spend, licenses, and other third-party costs separate.

### Consultation Watch

Reviews new website consultation requests, sets their priority, prepares a
response draft, and surfaces new requests to the owner. It never replies on its
own.

### Outreach Drafts

Creates concise, personalized first-contact drafts for the highest-priority
qualified prospects. Every factual statement must be supported by the saved
public source. Drafts are stored in Supabase for owner or salesperson review.

### Follow-Up Queue

Builds the daily follow-up list from outbound leads and inbound consultations,
prioritizing Hot and Warm opportunities. It prepares drafts but never sends
them.

### Growth & Site Health

Reads the SiteSync GA4 property, Netlify production state, GitHub repository,
and Supabase funnel counts. It reports actionable traffic or conversion changes
and alerts on deployment, form, or data-pipeline failures. It does not change
production, campaigns, or budgets.

## Current commercial rules

| Package | Price | Core limit |
| --- | ---: | --- |
| Website Build | $249 | Build only; hosting and maintenance excluded |
| Connected Launch | $500 | Connect up to 3 existing platforms |
| Business Setup | $899 | Connect up to 5 platforms; 1 year support |
| Full SiteSync | $1,499 | Connect up to 10 platforms; 2 years support |

Anything beyond Full SiteSync requires a separate consultation and custom
quote. Agents must not price or promise custom work independently.

## Channel constraints

- Facebook and Instagram are excluded until the owner explicitly enables them.
- Google Ads may be analyzed, but campaign or budget changes require explicit
  confirmation.
- All outbound communication remains draft-only until the owner approves a
  separate sending workflow.
