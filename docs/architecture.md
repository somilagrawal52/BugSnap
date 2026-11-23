# BugSnap architecture

The pnpm monorepo contains one Next.js App Router server, a vanilla TypeScript loader built by Vite, shared Zod contracts, and shadcn-style reusable controls. Supabase provides PostgreSQL, cookie-based Auth, and private Storage. There is no alternate production data store or fallback fake dashboard.

## Boundaries and data flow

1. Supabase Auth verifies users. Server components and mutations call `getUser`, then read through a cookie-bound client and RLS. Workspace ID is part of every business relationship. Owner/admin procedures handle privileged operations transactionally.
2. A public loader discovers its own deployment origin, fetches a domain-checked project configuration, and hosts an isolated iframe. A signed short-lived submission capability binds project, host origin, and a nonce. This is an abuse safeguard, not reporter identity. Challenge verification, honeypot, database rate limits, project status and workspace quota checks protect anonymous ingestion.
3. The iframe validates and submits multipart data. The server validates magic bytes, decodes/re-encodes images with sharp, and stages a private screenshot. A PostgreSQL procedure locks the organization, deduplicates the request, allocates its reference and records usage in one transaction. Failed attempts do not consume quota. Failed storage finalization is cleaned up; an orphan sweeper handles interrupted requests.
4. Private dashboard reads use RLS; report changes and comments produce events. Private screenshots are served only after a cookie-bound attachment lookup.
5. GitHub installation state is signed and bound to the authenticated administrator and workspace. Installation ownership is verified through the GitHub user authorization callback. Server-only installation tokens scope repository reads and issue creation. Export claims use a database state machine and stable issue marker; uncertain writes require reconciliation before any retry.

## Database and authorization design

`organizations` → `organization_members`, `organization_invitations`, `projects`, `github_installations`, `usage_daily`, `audit_logs`. Projects → domains, settings, reports. Reports → attachments, comments, events and exports. Composite foreign keys prevent cross-workspace project, repository and assignee relationships. RLS grants reads to members, management to admins, workspace settings to owners. No anonymous grants permit direct reads/writes of tenant tables. Security-definer procedures pin their search path and are explicitly granted. Public ingestion is service-role only and independently validates its signed capability.

Owner transfer/deletion and payments are intentionally deferred. Owners cannot be removed or demoted through member management. GitHub exports retain private authenticated report links rather than public screenshot URLs.

## Deployment

The requested Next.js/Node.js + sharp + Supabase stack targets Vercel, rather than the Sites Cloudflare Worker runtime. No live hosting is claimed. Environment configuration and a clean database migration are prerequisites for a working hosted beta.
