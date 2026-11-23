# GitHub App setup and export recovery

Create a GitHub App using your account's developer settings. Minimum repository permissions: **Issues read/write**, **Metadata read**. Do not request Contents. Subscribe to `installation` and `installation_repositories` webhook events.

Set both setup URL and user authorization callback URL to `https://YOUR_APP/api/github/callback`. Enable **Request user authorization (OAuth) during installation**. The callback requires `code`, `installation_id`, and the returned `state`; a plain unauthenticated installation ID is intentionally rejected. Use a separate GitHub App for localhost testing. The webhook URL is `/api/github/webhook` with a strong generated secret.

Configure all six GitHub environment variables in `.env.example`. A PEM private key may use literal `\n` separators. Keep secrets server-side. The installation redirect is signed, expires in ten minutes and is bound to a SameSite HttpOnly cookie, the current authenticated user and workspace. The callback exchanges the one-time user code and verifies that user can access the chosen installation before associating it. The short-lived user token is not stored. Installation access tokens are minted by Octokit on the server.

Owners/admins connect an installation and choose repositories. Members can export to selected, currently accessible repositories. An installation is unique across BugSnap organizations; a second tenant cannot silently take it over. Reinstalling reconnects a suspended installation to the same workspace. Verified webhooks refresh repository access and suspend removed installations.

## Duplicate prevention

Each `(report, repository)` has one export record. The transactional claim returns `claimed=true` to exactly one caller. Other callers see processing or completed. Processing older than two minutes transitions to `needs_reconciliation`, never directly to another create call.

The issue body contains `<!-- bugsnap-export:EXPORT_UUID -->`. Reconciliation walks open and closed issues looking for that marker. A found issue completes the existing export. Absence leaves the export paused: GitHub API/index consistency or edited/deleted content can make absence uncertain. An operator must inspect GitHub before manually resetting such a record. This intentionally favors avoiding duplicates over automatic recovery.

Definite client errors (access removal, validation rejection, rate limits) mark failure and can retry after correction. Network timeouts, server errors, or a database failure after a create call mark uncertainty. Credentials, full GitHub error bodies, and tokens are not sent to clients.

Screenshots remain private. Issues include an authenticated report link; GitHub repository access does not grant BugSnap workspace access.
