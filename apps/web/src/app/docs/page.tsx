import { MarketingNav, MarketingFooter } from '@/components/marketing';
import { CopyCode } from '@/components/copy-code';
import { appUrl } from '@/lib/env';
const sections = [
  ['overview', 'Overview'],
  ['installation', 'Installation'],
  ['configuration', 'Configuration'],
  ['domains', 'Keys & domains'],
  ['privacy', 'Data & screenshots'],
  ['github', 'GitHub App'],
  ['roles', 'Workspace roles'],
  ['limits', 'Usage limits'],
  ['api', 'API reference'],
  ['security', 'Security model'],
  ['deployment', 'Deployment'],
  ['troubleshooting', 'Troubleshooting'],
];
export default function Documentation() {
  const url = appUrl();
  return (
    <>
      <MarketingNav />
      <div className="docs-layout">
        <nav className="docs-nav">
          <strong>DOCUMENTATION</strong>
          {sections.map(([id, title]) => (
            <a href={`#${id}`} key={id}>
              {title}
            </a>
          ))}
        </nav>
        <article className="prose-page">
          <p className="eyebrow">A GOOD PLACE TO START</p>
          <h1>Less setup. More context.</h1>
          <p>
            Everything you need to get BugSnap into your application and your engineering workflow.
          </p>
          <h2 id="overview">What BugSnap does</h2>
          <p>
            BugSnap adds an isolated feedback widget to your website. Visitors submit structured
            reports without a dashboard account. Your team sees them in a private workspace, triages
            them, and optionally exports them as GitHub issues.
          </p>
          <p>
            The SDK supports current Chrome, Edge, Firefox, and Safari browsers with ES2022, Fetch,
            Shadow DOM, iframe, and Web Crypto support. Internet Explorer and older embedded
            webviews are not supported.
          </p>
          <h2 id="installation">Install your widget</h2>
          <p>
            Create a workspace and project, enter your exact authorized origin, then copy the
            project’s installation snippet. Include it once per page. The script loads
            asynchronously.
          </p>
          <h3>HTML</h3>
          <CopyCode
            code={`<script src="${url}/widget.js"\n  data-project-key="YOUR_PUBLIC_PROJECT_KEY"\n  async></script>`}
          />
          <h3>Next.js App Router</h3>
          <CopyCode
            code={`import Script from 'next/script';\n\nexport default function Layout({ children }) {\n  return <html lang="en"><body>\n    {children}\n    <Script src="${url}/widget.js"\n      data-project-key="YOUR_PUBLIC_PROJECT_KEY"\n      strategy="afterInteractive" />\n  </body></html>;\n}`}
          />
          <h3>React</h3>
          <p>
            For a conventional React application, put the HTML snippet in <code>index.html</code>.
            To manage the lifecycle yourself, load the script without the data attribute and
            initialize it in an effect:
          </p>
          <CopyCode
            code={`// First load ${url}/widget.js in index.html\nuseEffect(() => {\n  void window.BugSnap?.init({\n    projectKey: 'YOUR_PUBLIC_PROJECT_KEY',\n    appOrigin: '${url}',\n  });\n  return () => window.BugSnap?.destroy();\n}, []);`}
          />
          <p>
            For Vue, Angular, and other SPAs, use the same script tag. Context is refreshed when the
            widget opens and while it remains open.
          </p>
          <h2 id="configuration">Widget configuration</h2>
          <p>
            Set the label, color, corner, and optional application version in Project settings. The
            hosted form stays visually consistent; the accent applies to the host button. JavaScript
            initialization also supports these overrides:
          </p>
          <CopyCode
            code={`await window.BugSnap.init({\n  projectKey: 'YOUR_PUBLIC_PROJECT_KEY',\n  appOrigin: '${url}',\n  label: 'Send feedback',\n  accent: '#6554e8',\n  position: 'bottom-right',\n});\nwindow.BugSnap.open();\nwindow.BugSnap.close();\nwindow.BugSnap.destroy();`}
          />
          <p>
            Position accepts <code>bottom-right</code> or <code>bottom-left</code>. Labels allow 40
            characters; accent colors use six-digit hexadecimal. Initialization is idempotent.
            Destroy removes the button, iframe, event listeners, and timers. Reopen the widget after
            a 15-minute session expires to obtain a new submission capability.
          </p>
          <h2 id="domains">Project keys & authorized domains</h2>
          <p>
            A public project key identifies where reports belong. It is safe to include in your
            site, but it is not an authentication secret. Dashboard data always requires a verified
            session and workspace membership.
          </p>
          <p>
            Enter an exact origin such as <code>https://app.example.com</code>, with a port when
            applicable. Development projects also accept <code>http://localhost:3001</code> and{' '}
            <code>http://127.0.0.1:3001</code>. Paths, wildcard domains, credentials, queries, and
            fragments are rejected. Changing a key requires updating the installed snippet.
          </p>
          <p>
            Domain checks are an installation safeguard, not proof of a reporter’s identity. For a
            public beta, configure Turnstile and a trusted reverse proxy in addition to the database
            rate and quota controls.
          </p>
          <h2 id="privacy">Data collected & screenshots</h2>
          <p>
            Reports include the page origin and pathname, browser family and version where
            available, operating system where available, viewport, timestamp, project environment,
            and your explicitly configured app version. Query strings and URL fragments are
            excluded.
          </p>
          <p>
            BugSnap does not inspect cookies, browser storage, authentication headers, form fields,
            network request bodies, or continuous screen recordings. Reporter email is voluntary.
            Avoid putting secrets in URL paths; pathnames are included.
          </p>
          <p>
            Reporters may select or paste one PNG, JPEG, or WebP image up to 5 MB. The form previews
            it and allows removal. The server checks file signatures, decodes within a 25-megapixel
            limit, rejects animation, and re-encodes to WebP without EXIF metadata. There is no
            hidden capture or redaction tool; reporters should crop sensitive content before
            selecting an image.
          </p>
          <p>
            Screenshots are stored privately and served only after an authenticated attachment
            lookup. GitHub issues include a private report link, never a public screenshot URL.
          </p>
          <h2 id="github">Set up a GitHub App</h2>
          <ol>
            <li>
              Create a GitHub App with Metadata read and Issues read/write. Do not request Contents
              permissions.
            </li>
            <li>
              Set the callback URL and setup URL to <code>{url}/api/github/callback</code>. Enable
              “Request user authorization (OAuth) during installation”.
            </li>
            <li>
              Set the webhook URL to <code>{url}/api/github/webhook</code>. Subscribe to
              installation and installation repository events.
            </li>
            <li>
              Generate a private key and webhook secret. Configure the App ID, slug, client
              ID/secret, PEM private key, and webhook secret on the server.
            </li>
            <li>
              As a workspace owner/admin, open Integrations, connect GitHub, and select
              repositories. Members can then export reports.
            </li>
          </ol>
          <p>
            Installation ownership is checked using the authorized GitHub user. Tokens remain
            server-side. A GitHub installation can belong to one BugSnap workspace. Access removal
            disables exports.
          </p>
          <p>
            Repeated export requests reuse one record. If a request times out after the issue may
            have been created, the export pauses and searches for its stable marker. If no matching
            issue is found, it stays paused for operator review. This avoids blindly creating
            duplicates.
          </p>
          <h2 id="roles">Workspace roles</h2>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Owner</td>
                <td>
                  All reports, projects, invitations, integrations, workspace settings, role
                  management.
                </td>
              </tr>
              <tr>
                <td>Admin</td>
                <td>
                  Projects, reports, integrations, member invitations and member removal. Cannot
                  promote admins or change owners.
                </td>
              </tr>
              <tr>
                <td>Member</td>
                <td>
                  View and triage reports, assign teammates, comment, export to selected
                  repositories.
                </td>
              </tr>
              <tr>
                <td>External reporter</td>
                <td>Submit through the widget only. No private reads.</td>
              </tr>
            </tbody>
          </table>
          <p>
            Invitations produce a shareable link rather than sending email. The recipient must sign
            in with the verified invited email. Links expire after seven days. Member removal
            revokes workspace access while preserving historical comments and events. Ownership
            transfer and workspace deletion are operator-assisted during beta.
          </p>
          <h2 id="limits">Usage quotas</h2>
          <p>
            Free: 1 project and 50 reports per UTC month. Planned Starter: 3 projects and 500
            reports. Planned Team: 10 projects and 2,000 reports. These limits are experimental.
            Only Free is self-service during beta; no checkout exists.
          </p>
          <p>
            Project creation and report quotas are enforced in PostgreSQL. Failed submissions do not
            consume monthly reports. Repeating the same idempotency key returns the original
            confirmation.
          </p>
          <h2 id="api">API reference</h2>
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GET /api/widget/config</td>
                <td>
                  Public key + origin → domain-checked widget configuration and a short-lived
                  submission capability.
                </td>
              </tr>
              <tr>
                <td>POST /api/public/reports</td>
                <td>
                  Widget-only multipart submission. Bearer capability + UUID Idempotency-Key.
                  Fields: JSON report and optional screenshot.
                </td>
              </tr>
              <tr>
                <td>GET /api/attachments/:id</td>
                <td>Cookie-authenticated, tenant-authorized private image.</td>
              </tr>
              <tr>
                <td>GET /api/github/connect</td>
                <td>Owner/admin installation flow.</td>
              </tr>
              <tr>
                <td>POST /api/github/export</td>
                <td>Authenticated same-origin JSON: reportId, repositoryId.</td>
              </tr>
              <tr>
                <td>POST /api/github/webhook</td>
                <td>Raw body verified using X-Hub-Signature-256.</td>
              </tr>
            </tbody>
          </table>
          <p>
            The ingestion API is intended for the shipped widget rather than general-purpose public
            API access. Required fields: title (3–180 characters), description (10–10,000), and safe
            context. Optional: steps (5,000), expected/actual (3,000 each), email, screenshot.
            Errors return a generic message without stack traces.
          </p>
          <p>
            On a network failure, retry the original payload with the same UUID. Do not change
            content while retrying an uncertain request. Domain/disabled-project failures require an
            administrator to fix installation; quota/rate failures should wait. Rate errors include
            a Retry-After header where applicable.
          </p>
          <h2 id="security">Security model</h2>
          <p>
            Every tenant table has RLS enabled. Direct client writes are revoked. Composite foreign
            keys stop assignments, reports and repositories from crossing workspaces. Cookie
            sessions are verified on the server. React escapes report text and comments. Admin
            credentials never enter client bundles.
          </p>
          <p>
            The host and iframe exchange versioned messages bound to an exact origin, source window,
            and random channel. Dashboard and auth routes deny embedding. The widget permits only
            its requested host in CSP, and its page separately validates that host against project
            configuration.
          </p>
          <p>
            The current CSP permits inline scripts/styles for Next.js hydration; a nonce-based
            strict policy is a future hardening step. Public ingestion remains susceptible to
            determined automated abuse without a configured challenge. Review the launch checklist
            before opening public beta.
          </p>
          <h2 id="deployment">Deployment & environment</h2>
          <p>
            Use Node 22.17+ and pnpm 10.34.7. Install dependencies, apply migrations, configure
            environment variables, then build the widget and Next.js application. The root README
            includes copy-ready commands and a complete environment reference.
          </p>
          <CopyCode
            code={`pnpm install --frozen-lockfile\n# Copy .env.example to apps/web/.env.local\n# Apply supabase/migrations in timestamp order\npnpm typecheck\npnpm lint\npnpm test\npnpm build\npnpm --filter @bugsnap/web start`}
          />
          <p>
            For Vercel, choose the repository root, build with <code>pnpm build</code>, and
            configure the Next.js project root as <code>apps/web</code> with monorepo access
            enabled, or use the explicit configuration in the deployment guide. Set the public app
            URL to your HTTPS deployment origin before building.
          </p>
          <p>
            Run screenshot orphan cleanup daily with <code>pnpm cleanup</code> from a server
            environment. Keep database backups and Storage backups separately; test restoration in
            staging. Seed data is never inserted automatically.
          </p>
          <h2 id="troubleshooting">Troubleshooting</h2>
          <ul>
            <li>
              <strong>Widget doesn’t appear:</strong> verify the key, project enabled state, exact
              origin including port, script URL, and host CSP.
            </li>
            <li>
              <strong>Host CSP blocks it:</strong> allow the BugSnap origin in script-src, frame-src
              and connect-src. Do not weaken other host protections.
            </li>
            <li>
              <strong>Session expired:</strong> sign in again. To refresh a widget token, close it
              and reload the page or destroy/reinitialize the SDK.
            </li>
            <li>
              <strong>Screenshot rejected:</strong> use a nonanimated PNG/JPEG/WebP under 5 MB and
              25 megapixels. File extensions alone do not determine content.
            </li>
            <li>
              <strong>GitHub export paused:</strong> reconcile the existing record. Never delete its
              marker or retry issue creation manually without verifying GitHub.
            </li>
            <li>
              <strong>No reports:</strong> clear filters, confirm the selected workspace/project,
              then send a real report from an authorized origin.
            </li>
          </ul>
        </article>
      </div>
      <MarketingFooter />
    </>
  );
}
