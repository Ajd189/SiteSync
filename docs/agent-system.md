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

Finds legitimate small businesses anywhere in the United States using public
sources, starting with contractors/home services, restaurants, salons/retail,
and professional services. It rotates among regions and states, records
verifiable need signals and source URLs, and saves only businesses with a
verified public business email. It deduplicates results and never gathers
private personal data.

### Lead Qualifier

Reviews new prospects, first reverifies the saved public business email, then
assigns a 0–100 fit score and Hot/Warm/Cold rating and recommends the smallest
package that fits the documented need. A lead without a reverified email is
disqualified. It must use the published package scope and keep domain, hosting,
email, software, subscriptions, ad spend, licenses, and other third-party costs
separate.

### Consultation Watch

Reviews new website consultation requests, sets their priority, prepares a
response draft, and surfaces new requests to the owner. It never replies on its
own.

### Outreach Drafts

Creates complete, personalized first-contact email drafts for the
highest-priority qualified prospects. A draft may be prepared only after the
saved public business email is reverified. Each draft includes a subject line,
documented observation, industry-specific mini-assessment, recommended package,
cost boundary, consultation link, and owner signature. Every factual statement
must be supported by the saved public source. Drafts are stored in Supabase for
owner or salesperson review and are never sent automatically.

### Follow-Up Queue

Builds the daily follow-up list from outbound leads with a reverified public
business email and inbound consultations with a customer-provided email,
prioritizing Hot and Warm opportunities. It prepares drafts but never sends
them.

### Growth & Site Health

Reads the SiteSync GA4 property, Netlify production state, GitHub repository,
and Supabase funnel counts. It reports actionable traffic or conversion changes
and alerts on deployment, form, or data-pipeline failures. It does not change
production, campaigns, or budgets.

## Nationwide prospecting standard

SiteSync can deliver website and platform work remotely, so outbound
prospecting is nationwide and has no local-market preference.

- Rotate among U.S. regions and states instead of repeatedly using one local
  directory.
- When five qualified prospects are available, aim for at least three states
  and no more than two prospects from one state.
- A verified public business email is mandatory. A phone number or contact form
  alone does not qualify a business for the outbound pipeline.
- The email must be visibly published for business contact by the business or a
  credible current public business source. A publicly listed business-use
  Gmail, Outlook, or similar address is acceptable.
- Never guess, infer, generate, purchase, or enrich an email address, and never
  collect private personal contact data.
- Open and verify the original source and the business website when one exists;
  never rely only on search snippets.
- Do not add weak prospects to fill a quota.
- Existing records without a verified email remain preserved for research but
  must be marked Disqualified and excluded from drafting and follow-up.

## Outreach email standard

First-contact outreach is a useful mini-assessment, not a brief generic sales
message. The drafting agent must:

1. Reverify the recipient's public business email before drafting.
2. Produce a subject line and a polished body of roughly 140–220 words.
3. Address a verified contact name when available; otherwise use a natural
   neutral greeting and never invent a name.
4. State how SiteSync found the business through the saved public source.
5. Describe only a documented gap instead of making unsupported claims about
   the business's entire online presence.
6. Recommend three to five improvements relevant to the industry, such as a
   mobile menu, appointment path, estimate form, product or vendor directory,
   directions, or lead-capture form.
7. Explain how those improvements make it easier for customers to act.
8. Offer no more than the saved recommended package and quote the published
   price exactly.
9. State that SiteSync pricing covers SiteSync's work only. Domain, hosting,
   email hosting, paid apps/plugins, subscriptions, software/platform fees,
   advertising spend, and other third-party costs remain separate.
10. End with a low-pressure consultation invitation, say that no payment is
    needed to discuss the project, include `https://sitesync.us.com`, and sign
    `Austin` / `SiteSync`.

Drafts must avoid scare tactics, guarantees, invented outcomes, excessive
jargon, generic mass-mail language, and references to scraping, automation, or
AI. Preparing a draft does not count as contacting a prospect.

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
