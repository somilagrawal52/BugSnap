import { Bug } from 'lucide-react';
import Link from 'next/link';
export function Brand({
  compact = false,
  href = '/',
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} className="brand" aria-label="BugSnap home">
      <span className="brand-icon">
        <Bug size={21} strokeWidth={2} />
      </span>
      {!compact && (
        <>
          bugsnap<span className="beta">BETA</span>
        </>
      )}
    </Link>
  );
}
