# Security review and beta launch checklist

This is a source-level and local-test review, not a penetration test or a claim of production readiness. See `verification.md` for evidence and remaining live checks.

## Controls implemented

- All 17 application tables have RLS. No anonymous tenant reads or direct writes. Authenticated reads require workspace membership. Invitation hashes/audit logs additionally require admin. Private business writes go through role-checked procedures. PostgreSQL functions pin `search_path`, revoke PUBLIC execute, and use explicit grants.
- Composite foreign keys bind project/report/attachment/comment/repository/export/assignee relationships to one workspace. Members cannot promote themselves, manage projects, change billing entitlements, or mutate workspace roles. Owners cannot be demoted through this UI.
- Server components and authenticated endpoints verify Supabase users; administrative clients stay server-side. The private attachment endpoint performs a cookie-client RLS lookup before privileged Storage download.
- Public config/ingestion validate enabled projects, allowed origins and signed capabilities. Rate windows persist in PostgreSQL across instances. Monthly accounting, idempotency and references share an organization lock/transaction. Validation failure rolls back usage.
- Raw body limits apply without relying on Content-Length. File signatures and actual decoder output are inspected. Only static PNG/JPEG/WebP under 5 MB and a pixel limit are accepted, re-encoded without EXIF. Random private object paths prevent user-controlled names. Failed upload finalization checks for committed attachment references before removal; daily cleanup catches interrupted orphan uploads.
- React renders text without dangerous HTML. API search input is restricted before constructing PostgREST filters. Queries use Supabase parameterization; SQL procedures do not interpolate reporter text.
- Server Actions use Next.js origin checking; cookie-authenticated export requires the configured exact origin. GitHub callbacks use signed expiring state and a cookie. Webhooks validate HMAC over raw bytes with timing-safe comparison.
- Frame communication validates protocol/channel/type/source/origin, targets exact origins, and validates context. Private pages disallow framing. Headers include CSP, nosniff, referrer and feature restrictions. Sensitive endpoint responses are no-store.
- No tokens, raw IPs, payloads or reporter emails are logged by application code. Rate IDs use an HMAC with daily scoping. Old windows can be pruned by cleanup.

## Explicit limits / launch gates

- Configure real HTTPS origins, Supabase Auth email delivery/redirects, GitHub App installation/callback/webhook delivery, Turnstile, secret rotation, and a trusted proxy before a public beta. Ingestion is anonymous and determined abuse remains possible; domain checks are not authentication.
- Current CSP permits inline Next.js scripts/styles. Nonce-based strict CSP is deferred. No unsafe report HTML is rendered. The host SDK needs Shadow DOM inline styles; customers with strict style CSP may require an integration-specific nonce/style strategy.
- PGlite runs genuine PostgreSQL RLS/constraints, with representative auth/storage schemas. It is single-process, so concurrent queued tests do not establish distributed lock behavior or hosted Supabase equivalence. Run multi-connection concurrency/load tests against a dedicated Supabase staging database.
- Configure ingress body/time limits on the deployment platform too. Image decoding uses 25 MP limits; load-test memory usage on the chosen runtime. Very large issue reconciliation scans may exceed a serverless request time limit; exports remain paused rather than blind-retrying. A background reconciliation worker is a later scale feature.
- Member removal archives the membership and revokes access while retaining authorship. Assignments require active membership. Operator-assisted account/workspace erasure still needs a formal retention workflow before general availability.
- Add operator monitoring for failed uploads, repeated rate/quota rejection, export reconciliation, webhook failures, failed email delivery and cleanup jobs without logging personal report content.
- Establish privacy terms, retention/deletion policy, incident contacts, dependency scanning and backup procedures. Payments/SSO/AI/network capture are deferred.

## Required manual staging checks

- [ ] Signup email, confirmation, login/logout, expiration/refresh, recovery email and reset work on HTTPS.
- [ ] Invite acceptance uses the exact verified email; owner/admin/member permissions behave in two isolated real workspaces.
- [ ] Install SDK on a separate origin; submit screenshot by file/paste; confirm no URL query/hash and no private reads.
- [ ] Block foreign attachment reads both via API and direct Storage access.
- [ ] Saturate quota and race many submissions across separate PostgreSQL connections; verify no duplicates or quota overrun.
- [ ] Install GitHub App in staging; verify repository selection, issue creation/link persistence, rate/access errors, webhooks, uncertain-write recovery.
- [ ] Run orphan cleanup, backup database and objects, and restore both in an isolated environment.
- [ ] Verify mobile keyboard navigation and challenge accessibility on target browsers.
