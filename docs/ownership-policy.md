# Client ownership, SiteSync administration, and handoff

## Owner-directed policy

The client is the legal owner of the website. SiteSync retains administrative possession and control of the website, including its files, hosting configuration, and administrator access, throughout the included support period and any additional monthly support purchased. The client receives possession of the website files and administrative access when the active support period ends. If no ongoing support is selected, handoff takes place at project completion.

Administrative possession does not transfer legal ownership to SiteSync or delay the public launch of the website. The client's domain, business accounts, and client-provided content remain theirs. Third-party platforms, software, and licensed components remain subject to their own ownership and license terms. The signed service agreement defines the ownership rights, support term, and handoff process.

## Relationship to support packages

- Website Build: no included ongoing support; handoff at completion unless optional support is selected ($100/month).
- Connected Launch: no included ongoing support; handoff at completion unless optional support is selected ($100/month).
- Business Setup: SiteSync administers the site through 6 included months and any purchased $50/month extensions; handoff when active support ends.
- Full SiteSync: SiteSync administers the site through 1 included year and any purchased $25/month extensions; handoff when active support ends.

No new minimum renewal, automatic charge, transfer fee, payment condition, cancellation restriction, ownership forfeiture, or account-access restriction is created by this marketing update. It does not amend already signed contracts or actually change permissions on any client's account. Existing agreements govern their respective projects.

## Agreement drafting note

This page states a business policy; it is not itself an executed assignment of copyright. Any assignment of applicable rights in client-specific deliverables, license to retained tools or third-party components, support term, authorized administration, and transfer procedures should be expressly recorded in the signed client agreement. Do not promise ownership of third-party software, stock assets, or platform infrastructure.

Primary reference reviewed: U.S. Copyright Office, 17 U.S.C. sections 202 and 204, https://www.copyright.gov/title17/92chap2.html . Section 202 distinguishes copyright from possession of copies; section 204(a) generally requires a signed writing to transfer copyright ownership. This is a drafting reference, not a statement that any particular client agreement is enforceable.

## Implementation

`scripts/ownership-policy.mjs` runs after the existing support normalization in the supported npm build/dev commands. It updates the homepage ownership disclosure, comparison table, FAQ, consultation note, handoff-guide text, and package-builder descriptions. The resulting files contain the policy before they reach the browser; this is not a runtime legal-text rewrite. The script is repeatable and fails on missing copy targets. The changed browser script receives an additional cache version parameter.

The complete existing automated suite plus eight ownership tests must pass through the unchanged Netlify `npm test` build gate. This commit does not claim a successful deployment or browser/email verification; release results are recorded separately after verification.
