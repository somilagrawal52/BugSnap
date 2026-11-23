# Deploy to Vercel + Supabase

The application uses Next.js/Node.js and sharp. It is built for Vercel rather than Sites' Cloudflare Worker runtime. No hosted deployment is implied by a passing local build.

1. Create separate staging and production Supabase projects. Configure email/password Auth, strong password requirements, SMTP, Site URL and redirect allowlist. Use `/auth/callback`; the recovery flow passes the allowed `/reset-password` destination through that callback.
2. Apply all SQL in `supabase/migrations` in filename order, using the Supabase CLI (`supabase link`, then `supabase db push`) or SQL migration tooling. Review schema changes before production. Migrations create a private `screenshots` bucket; do not add anonymous Storage policies.
3. Import this repository in Vercel. Choose **Next.js**, root directory **apps/web**, and enable access to files outside that root (monorepo packages). `apps/web/vercel.json` installs/builds from the monorepo root. Next output remains `apps/web/.next`. Node 22 or 24.
4. Add the required `.env.example` values in Vercel project settings. `NEXT_PUBLIC_APP_URL` must equal your HTTPS canonical origin. Set all public variables before build; server secrets must not have the NEXT_PUBLIC prefix. Run `pnpm check:env` in a matching environment.
5. Configure GitHub and Turnstile using the exact deployed origin. See `github.md`. Do not enable paid checkout; none exists.
6. Run checks/build, deploy, then complete the staging/security checklist. The app will show setup instructions rather than fabricate private data when Supabase is missing.
7. Install the production widget script from each project's settings. Hosting caches `widget.js` for five minutes; plan versioning/cache invalidation for future breaking SDK releases.

## Operations

- Run `pnpm cleanup` daily in a trusted scheduled environment with server-only Supabase credentials. It deletes unreferenced objects older than 24 hours and old rate windows. This job is not scheduled automatically by this repository.
- Keep GitHub webhook delivery healthy; non-2xx processing should be retried by GitHub. Replays are idempotent for suspension/repository refresh. Repository changes must disable revoked exports promptly.
- An uncertain GitHub create remains paused until reconciliation finds its marker or an operator reviews the repository. Do not reset it blindly.
- Monitor database/storage usage, report quota rejection, 429/5xx rates, authentication mail delivery and cleanup completion. Log identifiers/error categories without private report payloads or tokens.

## Backups and recovery

Enable the Supabase backup/PITR features appropriate to your plan and retain encrypted exports outside the primary project. Supabase database backups do **not** by themselves back up Storage object bytes. Back up the private bucket separately with access control and retention matching the reports.

Test restoring database and Storage to a separate project; reconcile object paths and reports, rotate credentials, set new Auth URLs, and reconnect GitHub deliberately. Avoid replaying pending exports automatically after restore: an issue may already exist in GitHub. Retain export IDs/markers and reconcile before any create retry.

Production seed data is never automatic. `seed.ts` requires an explicit remote opt-in and must only target a dedicated fictional demo/development project. Do not expose seed owner credentials. Use a separate public demo tenant and key for portfolio visitors.
