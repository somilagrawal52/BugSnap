# Verification — 23 November 2026

## Verified locally

- **Clean SQL migration test:** all seven migrations applied to a new PGlite PostgreSQL database, including representative Supabase Auth roles/claims and Storage bucket catalog. All 17 application tables have RLS.
- **Real local Supabase:** Docker Desktop stack started, migrations applied to PostgreSQL 17, environment generated from actual CLI credentials, and fictional Acme Labs seeded. Repeating the seed succeeded without duplicate reports. Cleanup ran successfully and found zero abandoned screenshots.
- **59 Vitest tests passed**, including four tests against real local Supabase HTTP/Auth/PostgREST using independent authenticated clients. Coverage includes cross-tenant read/write rejection, private attachment metadata, active memberships, admin roles/invitations, assignment constraints, transactional rollback, project/report quotas, unique references, idempotent retries, rate counters, export claims/reconciliation, widget lifecycle/origin checks, safe context, image signatures/limits/re-encoding, signed capabilities and webhook HMACs.
- **Actual concurrency:** 12 parallel new report RPCs received unique references. Eight parallel retries returned the existing report. A race of 12 requests against one remaining quota slot accepted exactly one and rejected eleven; usage remained at 50. This is a bounded local test, not a production load test.
- **GitHub transport mocks:** valid issue payload and persisted link, duplicate claims/completed exports, timeouts, 403/404/422/429, suspended/cross-tenant installation rejection, marker reconciliation and safe pause on marker absence.
- **6 Playwright Chromium tests passed** against the production Next.js server. The full real-backend flow used signup, actual confirmation email captured in local Mailpit and callback, login, workspace/project creation, a separate origin (`127.0.0.1:3211`), form validation, image selection/preview, real report/storage persistence, private screenshot denial/access, triage/comment persistence, filters, mobile/dashboard rendering, logout, real recovery email/callback/password reset and login with the new password. Other tests cover marketing navigation, honest pricing, documentation, unauthenticated dashboard protection, mobile horizontal overflow, SDK keyboard behavior and hostile messages.
- TypeScript checks pass across app, SDK/shared/UI packages, example, scripts, and tests.
- ESLint passes. Production Next.js build passes, and the independent Next.js example build passes.
- `pnpm audit --prod` returned **0 known vulnerabilities** across all severity levels at the time of this run. This is registry advisory evidence, not a security guarantee.
- Actual SDK production measurement: **4,636 bytes raw; 2,107 bytes gzip; 1,763 bytes Brotli**.
- Desktop and 390px mobile dashboard screenshots were inspected. Public pages passed overflow checks at 390px. Chart animation is disabled for deterministic rendering and reduced distraction.

## Reproduce

```powershell
pnpm install --frozen-lockfile
pnpm check:env
pnpm typecheck
pnpm lint
$env:LIVE_SUPABASE_TESTS='1'
pnpm test
pnpm build
pnpm --filter @bugsnap/demo build
$env:E2E_BACKEND='1'
pnpm test:e2e
```

Local Supabase must be running for the two opt-in suites. Live tests refuse remote database origins. Browser tests use a local mail capture service and generate fictional test accounts; they never require or print a real user's password. The default CI run skips the live Supabase tests and runs the five public browser checks without credentials.

## Not verified / remaining launch work

- No live GitHub App credentials were supplied. Installation/OAuth callback, actual GitHub issue creation, installation tokens and webhook delivery require a dedicated staging App and repository. Mocks do not verify the live integration.
- No public deployment was performed. Vercel/Supabase production projects, HTTPS domains, SMTP delivery, operational secrets, Turnstile and webhook configuration remain operator setup.
- Email confirmation/recovery were verified through **local Mailpit**, not an external SMTP provider. Broader Safari/Firefox/Edge, keyboard/screen-reader and hosted cookie/security behavior require staging QA.
- Review legal/privacy/retention requirements and operator deletion/ownership transfer workflows before general availability. Paid billing is explicitly deferred; no checkout exists.
- Daily cleanup is implemented but not scheduled. Backups and disaster recovery are documented but no restore drill was performed. Keep database and Storage backups separately.
- CSP still permits inline Next.js hydration scripts/styles. Nonce CSP and strict-CSP host SDK integration remain hardening work. Domain allowlists and signed capabilities alone do not prevent determined anonymous abuse.
- GitHub reconciliation scans can exceed serverless duration at large repository sizes. Uncertain exports stay paused; background processing is a future scale step.

The evidence supports a functioning local MVP and portfolio demonstration. It does not establish production readiness or a verified live GitHub deployment.

## Current workspace setup

The ignored local environment is configured for `http://127.0.0.1:3210` because port 3000 was already in use. `pnpm dev` reads that configured port. Local Supabase data and the fictional Acme Labs workspace are retained. The public demo widget and independent example use actual fictional development project keys. The preview servers used by Playwright were stopped after verification; start the UI with `pnpm dev` and the example with `pnpm --filter @bugsnap/demo dev`.

Local seed owner credentials are in the ignored environment file (`SEED_EMAIL` / `SEED_PASSWORD`), never in source or test output. New signup creates an independent private workspace. Stop the local database services later with `pnpm dlx supabase stop` without the destructive `--no-backup` flag.
