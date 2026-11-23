import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'BugSnap — bugs with context', template: '%s · BugSnap' },
  description:
    'Report bugs in seconds. Fix them with context. A private bug inbox for your engineering team.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
