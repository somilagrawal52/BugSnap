import Script from 'next/script';
export default function Layout({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_BUGSNAP_URL || 'http://localhost:3000';
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', margin: 0, background: '#fafaff', color: '#222238' }}>
        {children}
        {process.env.NEXT_PUBLIC_BUGSNAP_PROJECT_KEY && (
          <Script
            src={`${url}/widget.js`}
            data-project-key={process.env.NEXT_PUBLIC_BUGSNAP_PROJECT_KEY}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
