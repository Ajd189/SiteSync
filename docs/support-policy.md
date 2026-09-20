# Current SiteSync support policy

Owner-directed update, September 19, 2026. This supersedes the previous one-year Business Setup / two-year Full SiteSync wording and all earlier support quotations.

| Package | Purchase price (unchanged) | Included ongoing support | Optional additional support |
| --- | --- | --- | --- |
| Website Build | $249 | None | $100/month |
| Connected Launch | $500 | None | $100/month |
| Business Setup | $899 | 6 months | $50/month after the included period |
| Full SiteSync | $1,499 | 1 year | $25/month after the included period |

Additional support is priced by month, not a mandatory extra year. This update does not create a recurring charge, change existing signed agreements, or modify package purchase prices or other deliverables. SiteSync labor/service charges remain separate from third-party costs.

## Implementation

The canonical policy and template normalization are in `scripts/support-policy.mjs`. The checked-in marketing HTML and browser-script templates retain their baseline structure; **their legacy support strings are not the current offer**. All supported npm entry points (`dev`, `build`, `build:sites`, and the build invoked by `test`) normalize those files before using them. Do not deploy raw `public/` without running `npm run sync:support` or a supported build command. The deployed static HTML, comparison table, package cards, FAQ, consultation interest label, fallback recommendation, and browser-script package builder therefore all carry the current terms before the visitor receives the page. There is no client-side price rewrite or flash of obsolete pricing.

Normalization is repeatable and fails the build on an unexpected baseline template instead of silently publishing partial changes. Browser-script versioning changes with this release to avoid cached old recommendations. The new tests cover all four offers, every support surface, all 48 combinations of builder goals/platform counts/support choices, idempotency, and browser-script syntax. The existing electric visual enhancement, purchase prices, all server functions, and consultation/inbox flow are unchanged.

Production build and deployment verification are recorded in the release pull request after completion; this document does not claim tests have run merely because they exist.
