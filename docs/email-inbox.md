# Owner email inbox and site repair

Website inquiries POST to the validated consultation endpoint and are saved in the private Supabase consultation store. The existing hourly consultation workflow delivers new inquiries to the owner's verified Gmail inbox. It does not send responses to customers. The private delivery ledger reserves each consultation once, stores confirmed Gmail message IDs, and holds ambiguous attempts rather than retrying them. Recipient details remain in private configuration, not public HTML.

The legacy Netlify daily digest is disabled unless SITESYNC_NOTIFICATION_MODE is explicitly set to netlify-digest. Its default is disabled so it cannot prematurely mark inquiries delivered while Gmail owns the notification queue. The inbox page URLs redirect to Gmail; the unused private inbox API remains protected. This replaces the owner sign-in workflow; it does not repair Netlify Identity.

## Hosting configuration

Required server settings: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SITESYNC_FORM_KEY, PUBLIC_SITE_URL. Set SITESYNC_NOTIFICATION_MODE=gmail. The form key must match the hash in private.form_secrets. Do not put actual credentials in this repository, browser assets, logs, or public reports.

On the current Personal plan, use the default all-scopes environment configuration. Functions-only scope and the enhanced Contains secret values flag were not persisted by the connector. The connector returned an upsert acknowledgement despite the settings remaining absent; therefore always read the stored settings back and test the live endpoint after redeployment. Normal server environment values remain in the authenticated Netlify configuration, not the public repository or client JavaScript. Avoid exposing them through build output. On a plan that supports granular scopes, restrict server credentials to the appropriate scope.

Netlify environment changes require a new deployment to affect functions. A passing build or rejected empty form submission does not prove valid inquiry storage works. Required verification is an actual uniquely marked internal test through the live form, inspection of its saved row, confirmed owner Gmail delivery, and recorded delivery IDs. Close and mark test rows so they cannot trigger customer outreach.

## Layout and preservation

A targeted browser diagnostic identified the sample-report cards' intrinsic minimum width as the narrow-screen overflow source. The small-screen stylesheet allows the proof grid and its cards to shrink, and lets the sample audit heading wrap at 380px and below. It does not hide overflow or change navigation, footer, page copy, pricing, support periods, or electric visuals. Contract-only ownership wording remains absent.

The isolated browser audit uses puppeteer-core 24.15.0 and @sparticuz/chromium 138.0.2, which provide the CommonJS exports expected by scripts/audit-email-repair.cjs. These are temporary audit dependencies, not application dependencies. Record the actual audit report, including any failures. Do not infer completion from this document.

Notifications run at hourly checks, not instantly. This change does not purchase credits, change plans, activate ads, or enable automatic customer outreach.
