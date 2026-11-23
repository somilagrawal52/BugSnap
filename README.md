# BugSnap

Report bugs in seconds. Fix them with context.

A pnpm/TypeScript monorepo containing a Next.js marketing site and private engineering dashboard, a framework-independent iframe widget, Supabase PostgreSQL/Auth/private Storage, and a server-side GitHub App integration. There is no local-storage dashboard or simulated production backend.

## Start locally

Requires Node **22.17+**, pnpm **10.34.7**, and Docker Desktop for local Supabase. Node 24 LTS is also supported. The lockfile pins resolved dependencies; ESLint 9 and TypeScript 5.9 are retained for compatibility with the Next.js lint ecosystem.

```powershell
pnpm install --frozen-lockfile
pnpm dlx supabase start
pnpm setup:local
pnpm check:env
pnpm seed
pnpm dev
```

The Supabase CLI applies migrations automatically on first start. `setup:local` reads actual local API credentials from the CLI and creates the ignored `apps/web/.env.local`. It refuses to overwrite an existing file. It generates a private development seed password; do not publish or share the owner account. Open the URL printed by Next.js. If port 3000 is busy, set `BUGSNAP_LOCAL_URL` before setup and use the same port for Next.js and Supabase Auth redirects.

For a hosted Supabase project, copy `.env.example` to `apps/web/.env.local`, configure its real credentials and apply SQL migrations in order. Never use the service-role key in a browser or a `NEXT_PUBLIC_` variable. Set Auth Site URL and callback allowlist to your deployment origin plus `/auth/callback` (and the reset callback flow). Verify email before accepting invitations.

## Application workflow

1. Register and verify your email. Create a private workspace.
2. Create a project. Select development for localhost; use HTTPS for production/staging. Enter up to ten exact authorized origins, one per line.
3. Copy the async script from Project settings into your site. Use the included demo or the independent Next.js example to test it.
4. Submit a report, optionally selecting/pasting a screenshot. View it in the private inbox, change its status/priority/assignee, and add comments.
5. Configure a GitHub App, connect an installation, select repositories, and export the report. Issue links persist; uncertain writes pause for reconciliation.

The seeded **Acme Labs** workspace contains **Acme Dashboard**, **Acme Checkout**, and five fictional bugs. Seeding is explicit and repeatable. It changes only the dedicated demo organization to the Team entitlement to allow two projects. Never run it against customer/production data. Remote seeding requires an explicit `SEED_ALLOW_REMOTE=true` in a separate development project. To view the seeded workspace locally, sign in using `SEED_EMAIL` and `SEED_PASSWORD` from your ignored environment file. A new signup creates an independent workspace.

Visitors can see the fictional `/demo` page without private access. To enable actual anonymous demo submissions, configure `NEXT_PUBLIC_DEMO_PROJECT_KEY` for a separate demo project with your demo origin authorized. Keep its owner credentials private. Public visitors never receive dashboard sessions. With no project configured, the page explains setup instead of faking a successful submission.

## Commands

| Command          | Result                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`       | Build the SDK, then start Next.js.                                                                   |
| `pnpm build`     | Build the production SDK, measure compression, build Next.js.                                        |
| `pnpm typecheck` | Check every workspace package and example.                                                           |
| `pnpm lint`      | Lint application and test source.                                                                    |
| `pnpm test`      | Contracts, images, messaging, PostgreSQL authorization/constraints, ingestion, export state machine. |
| `pnpm test:e2e`  | Playwright public, auth boundary, responsive, and SDK tests; build first.                            |
| `pnpm check:env` | Validate configured environment without printing values.                                             |
| `pnpm seed`      | Explicit fictional development seed.                                                                 |
| `pnpm cleanup`   | Remove unreferenced screenshots older than 24 hours; prune old rate windows.                         |

Install Playwright Chromium with `pnpm exec playwright install chromium` before browser tests. CI is provided in `.github/workflows/ci.yml`. The PGlite PostgreSQL tests apply every migration on a clean database with representative Supabase roles, auth UID claims, and a Storage bucket catalog. They test actual SQL and RLS, but do not replace full hosted Auth/Storage or multi-process PostgreSQL load testing.

To run the real local backend suites in PowerShell, set `$env:LIVE_SUPABASE_TESTS='1'` before `pnpm test`, and `$env:E2E_BACKEND='1'` before `pnpm test:e2e`. They use separate fictional test workspaces and refuse remote Supabase URLs. The full browser flow checks real local email confirmation/recovery through Mailpit, external-origin reports, private screenshots, triage and logout. See [actual results](docs/verification.md).

## Repository map

```text
apps/web                 Next.js App Router, server routes, marketing, dashboard, iframe
packages/widget          TypeScript SDK, Vite IIFE build and compression measurement
packages/shared          Zod schemas, product constants, shared types and origin validation
packages/ui              shadcn-style Radix/CVA/Tailwind reusable controls
supabase/migrations      SQL tables, RLS, grants, procedures and private bucket
examples/nextjs-demo     Separate application demonstrating script installation
scripts                  Seed, orphan cleanup, local setup, environment validation
tests                    Unit, SQL integration and Playwright browser tests
docs                     Architecture, protocol, security, deployment, verification
```

## Environment

See `.env.example` for the full inventory. Public values are bundled at build time; rebuild after changing them.

- `NEXT_PUBLIC_APP_URL`: exact application origin; also controls CSRF checks and snippets.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public project API identifiers.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only ingestion, private screenshot access, integration persistence.
- `SUBMISSION_SECRET`: at least 32 random characters; signs widget capabilities/GitHub state and HMACs IP rate keys. Rotating it expires outstanding capabilities and connection state.
- GitHub App: `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`. See [setup](docs/github.md).
- Turnstile: configure **both** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` before an open public beta.
- `TRUST_PROXY`: use only with a proxy that overwrites `x-forwarded-for`. Vercel uses its platform-specific forwarded IP header automatically. Untrusted local environments deliberately share a local rate bucket.
- `NEXT_PUBLIC_DEMO_PROJECT_KEY`: optional isolated public demo project; never a customer project.

There is no checkout, billing webhook, or fake plan upgrade button. Free is self-service; Starter/Team entitlements are implemented for later operator/payment provisioning.

Read [architecture](docs/architecture.md), [installation/protocol](docs/widget-protocol.md), [security](docs/security.md), [deployment](docs/deployment.md), and [verification](docs/verification.md) before launch. The in-app `/docs` page is the installation and API guide.
