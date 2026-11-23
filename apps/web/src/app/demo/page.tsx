import Link from 'next/link';
import { Check, ShoppingBag, ShieldCheck } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing';
import { DemoWidget } from '@/components/demo-widget';
export default async function Demo({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const projectKey =
    key && /^bs_[a-f0-9]{32}$/.test(key) ? key : process.env.NEXT_PUBLIC_DEMO_PROJECT_KEY;
  return (
    <>
      <MarketingNav />
      <main className="demo-main">
        <div className="demo-banner">
          <span className="badge">SANDBOX</span>This is a fictional checkout page for testing your
          BugSnap widget.
        </div>
        <div className="demo-intro">
          <p className="eyebrow">MEET THE WIDGET, IN ITS NATURAL HABITAT</p>
          <h1>Spot it. Snap it. Send it.</h1>
          <p>
            Try a report on this demo page. Connected widgets submit to a real project, with real
            persistence.
          </p>
        </div>
        <div className="demo-checkout">
          <div className="demo-product">
            <span className="demo-product-logo">a.</span>
            <p>ACME LABS</p>
            <h2>
              A little space
              <br />
              to make great things.
            </h2>
            <div className="demo-illustration">
              <span />
              <span />
              <span />
            </div>
            <p>Acme Cloud · Fictional product</p>
          </div>
          <div className="demo-order">
            <ShoppingBag size={25} />
            <h2>Your order</h2>
            <div className="order-line">
              <span>
                Acme Cloud workspace
                <br />
                <small>Monthly subscription · demonstration only</small>
              </span>
              <strong>$24.00</strong>
            </div>
            <div className="order-line">
              <span>Total</span>
              <strong>$24.00</strong>
            </div>
            <p className="notice">
              No payment is collected. Use the feedback widget to report a problem with this
              example.
            </p>
            <DemoWidget projectKey={projectKey} />
            <p className="small muted">
              <ShieldCheck size={14} />
              No real purchases or personal information needed.
            </p>
          </div>
        </div>
        <div className="demo-instructions">
          <h2>Try the whole loop.</h2>
          <p>
            <Check size={16} />
            Describe a bug, optionally add a screenshot, and send.
          </p>
          <p>
            <Check size={16} />
            Open your private reports inbox to triage it.
          </p>
          <p>
            <Check size={16} />
            Connect GitHub and export it to an allowed repository.
          </p>
          <Link href="/dashboard/projects">Configure your project</Link> ·{' '}
          <Link href="/docs">Setup guide</Link>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
