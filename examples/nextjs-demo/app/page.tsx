export default function Page() {
  return (
    <main style={{ maxWidth: 720, margin: '90px auto', padding: 28 }}>
      <p style={{ color: '#6955e8' }}>ACME CHECKOUT · FICTIONAL EXAMPLE</p>
      <h1 style={{ fontSize: 48, letterSpacing: -2 }}>
        A separate app.
        <br />
        The same helpful context.
      </h1>
      <p>Use the floating BugSnap button to submit a report from this independent Next.js site.</p>
      <p>
        Configure a development project with the authorized origin{' '}
        <code>http://localhost:3001</code>. Set <code>NEXT_PUBLIC_BUGSNAP_PROJECT_KEY</code> in this
        example’s <code>.env.local</code>, then restart.
      </p>
      <p>
        Reports are persisted in your BugSnap workspace. This page does not collect payments or
        grant dashboard access.
      </p>
    </main>
  );
}
