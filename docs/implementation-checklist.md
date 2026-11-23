# Implementation and verification ledger

Track actual verification in `verification.md`; source implementation is not evidence of a live integration.

- [x] Phase 1: implemented and verified locally with real Auth/PostgreSQL, onboarding, roles, RLS, and password recovery.
- [x] Phase 2: verified on a separate origin with real submission, screenshot Storage, safe context, rate/quota controls.
- [x] Phase 3: real metrics, filters, persistent triage/comments/history, projects/team/settings and usage.
- [x] Phase 4 implementation: GitHub App flow, repositories, exports, signed webhooks and reconciliation, with transport/state-machine tests.
- [ ] Phase 4 live verification: requires a GitHub App and staging repository credentials.
- [x] Phase 5 local deliverables: marketing/docs/demo, repeatable seeds, entitlements, review, tests and deployment configuration.
- [ ] Phase 5 hosted launch: requires production services/configuration and the manual staging checklist.

Verification order: shared contracts and loader tests; clean PostgreSQL migrations and multi-tenant authorization/constraint tests; mocked GitHub transport tests; TypeScript/lint/build; Playwright marketing/auth/widget/responsive checks; credentialed Supabase and GitHub E2E when credentials are available.
