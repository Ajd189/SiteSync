# Owner email inbox and site repair

Website inquiries continue to POST to the existing validated consultation endpoint and are saved immediately in the private Supabase consultation store. The existing hourly consultation workflow now delivers a batch of new inquiries to the owner's verified Gmail inbox. It does not send responses to customers. The private delivery ledger reserves each consultation once, stores confirmed Gmail message IDs, and holds ambiguous attempts rather than retrying them. Recipient details remain in private configuration, not public HTML.

The legacy Netlify daily digest is disabled unless SITESYNC_NOTIFICATION_MODE is explicitly set to netlify-digest. Its default is disabled so it cannot prematurely mark inquiries delivered while Gmail owns the notification queue. The inbox page URLs redirect to Gmail; the unused private inbox API remains protected and is not exposed publicly. This is replacement of the owner sign-in workflow, not a repair of Netlify Identity.

Required functions-scoped settings: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SITESYNC_FORM_KEY, PUBLIC_SITE_URL. The form key must match the hash in private.form_secrets. Do not put secrets in this repository or browser assets. Keep actual inquiry text out of logs and public verification reports.

The small-screen stylesheet reflows navigation, footer, and tight card headers at 380px and below, instead of hiding document overflow. Pricing, support periods, electric visuals, customer form schema and validation, and the removal of contract-only website wording are unchanged.

Validation status must be recorded from executed tests and the live release, not inferred from this document. Hourly notification checks are not instant email delivery. A live test inquiry and a confirmed owner Gmail notification are required for end-to-end verification. This change does not purchase credits, change plans, activate ads, or enable automatic customer outreach.
