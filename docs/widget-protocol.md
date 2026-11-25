# Widget installation and host/iframe protocol v1

Use Project settings to copy your deployed script origin and real public key:

```html
<script src="https://YOUR_APP/widget.js" data-project-key="bs_YOUR_KEY" async></script>
```

For Next.js use `next/script` with `strategy="afterInteractive"`. For React/Vue/Angular, the same HTML script works. For explicit lifecycle management, load it without `data-project-key`, call `window.BugSnap.init({projectKey,appOrigin,label?,accent?,position?,hideLauncher?,email?})`, and call `destroy()` on teardown. Set `hideLauncher: true` (or `data-hide-launcher="true"` on the script tag) to open via your own UI button. Only one active instance is supported. `open()`, `close()`, `isOpen()`, and `setEmail(email)` control the existing panel. SPA context refreshes on open, history navigation and every two seconds while open. No host DOM content or application storage is inspected. On submission, the host SDK dispatches a `bugsnap:submitted` CustomEvent on `window`.

The script inserts a Shadow DOM launcher and an iframe with `sandbox="allow-scripts allow-same-origin allow-forms"`. These flags allow the hosted React form and same-origin API calls; the iframe is hosted on BugSnap, separate from customer origins. Host styling is isolated. The iframe is persistent while the SDK is mounted, so unsuccessful form state remains available. Destroy/reinitialize starts a fresh form.

Configuration is fetched with the public key and current origin. The API checks enabled state and authorized origins and returns appearance and a capability valid for 15 minutes. Opening after 12 minutes refreshes the capability. A key is an identifier and the capability is an anti-abuse boundary, not a human identity credential. Origin/CORS alone cannot prevent bots.

Every message is an object containing `protocol: "bugsnap:v1"`, a random per-instance UUID `channel`, and a `type`. Both ends validate exact sender origin and source window before processing payloads. No wildcard target origins are used.

| Direction     | Type        | Payload                                                        |
| ------------- | ----------- | -------------------------------------------------------------- |
| iframe → host | `ready`     | No additional data; host sends current context.                |
| host → iframe | `context`   | Signed `token` and shared-schema `context`.                    |
| iframe → host | `close`     | Close panel and return focus to launcher.                      |
| iframe → host | `submitted` | Notification only; private report IDs are not exposed to host. |

Context includes origin, pathname, browser family/version, OS, viewport width/height, timestamp and explicitly configured appVersion. No query, hash, cookies, storage, request bodies, console capture or device identifiers. The API overrides environment/version from project configuration and checks origin against the capability. Pathnames can themselves contain sensitive content; application owners should keep secrets out of paths.

Submission is multipart with `report` JSON and optional `screenshot`, sent same-origin by the iframe with a Bearer capability and UUID `Idempotency-Key`. A streamed 6 MB request limit and 5 MB image limit apply. Retries retain the original data/key after network interruption. The server hashes normalized payload and image content; key reuse with different content is rejected.

Host CSP must allow the BugSnap origin in `script-src`, `frame-src`, and `connect-src`. Dashboard/auth pages deny frames. `/widget` sets an exact `frame-ancestors` host and separately checks project domain authorization before rendering the form. Avoid wildcard CSP workarounds.

Loader build output is `apps/web/public/widget.js`. `pnpm --filter @bugsnap/widget build` prints actual raw/gzip/Brotli sizes; recorded measurements are in `verification.md`.
