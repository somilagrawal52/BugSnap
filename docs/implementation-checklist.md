# Implementation and verification ledger

Track actual verification in `verification.md`; source implementation is not evidence of a live integration.

- [ ] Phase 1: workspace, auth, onboarding, schema, roles, RLS, dashboard shell.
- [ ] Phase 2: isolated loader/iframe, context, screenshots, transactional ingestion and abuse controls.
- [ ] Phase 3: metrics, report filters/pagination, report changes, comments/history, projects/team/settings.
- [ ] Phase 4: real GitHub App flow, repositories, exports, webhook verification and reconciliation.
- [ ] Phase 5: marketing/docs/demo, seeds, entitlement UI, hardening, test/build/deployment documentation.

Verification order: shared contracts and loader tests; clean PostgreSQL migrations and multi-tenant authorization/constraint tests; mocked GitHub transport tests; TypeScript/lint/build; Playwright marketing/auth/widget/responsive checks; credentialed Supabase and GitHub E2E when credentials are available.
