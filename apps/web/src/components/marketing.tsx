import Link from 'next/link';
import { Brand } from './brand';
export function MarketingNav() {
  return (
    <header className="marketing-nav">
      <Brand />
      <nav>
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/docs">Documentation</Link>
      </nav>
      <div>
        <Link className="login-link" href="/login">
          Log in
        </Link>
        <Link className="button button-primary button-sm" href="/signup">
          Start free
        </Link>
      </div>
    </header>
  );
}
export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div>
        <Brand />
        <p>
          Report bugs in seconds.
          <br />
          Fix them with context.
        </p>
      </div>
      <div>
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/docs">Documentation</Link>
        <Link href="/demo">Live demo</Link>
      </div>
      <p>
        © {new Date().getFullYear()} BugSnap
        <br />
        <span>Built for the next fix.</span>
      </p>
    </footer>
  );
}
