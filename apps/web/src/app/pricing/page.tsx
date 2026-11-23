import Link from 'next/link';
import { Check } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '@/components/marketing';
export default function Pricing() {
  return (
    <>
      <MarketingNav />
      <main className="public-main">
        <div className="public-heading">
          <p className="eyebrow">SMALL TEAMS. CLEAR LIMITS.</p>
          <h1>
            A little less friction.
            <br />A lot more context.
          </h1>
          <p>
            Start with the Free beta. Paid plans are being shaped with early teams; pricing is not
            finalized.
          </p>
        </div>
        <div className="pricing-grid">
          {[
            {
              name: 'Free',
              price: '$0',
              note: 'Available in beta',
              projects: '1 project',
              reports: '50 reports / month',
            },
            {
              name: 'Starter',
              price: 'Coming soon',
              note: 'Proposed plan',
              projects: '3 projects',
              reports: '500 reports / month',
            },
            {
              name: 'Team',
              price: 'Coming soon',
              note: 'Proposed plan',
              projects: '10 projects',
              reports: '2,000 reports / month',
            },
          ].map((p, i) => (
            <article className={`panel pricing-card ${!i ? 'featured' : ''}`} key={p.name}>
              <span className="eyebrow">{p.note}</span>
              <h2>{p.name}</h2>
              <strong className="price">{p.price}</strong>
              <ul>
                {[
                  p.projects,
                  p.reports,
                  'Private screenshots',
                  'Report triage & comments',
                  'GitHub App issue export',
                ].map((v) => (
                  <li key={v}>
                    <Check size={16} />
                    {v}
                  </li>
                ))}
              </ul>
              {!i ? (
                <Link href="/signup" className="button button-primary">
                  Start free
                </Link>
              ) : (
                <p className="notice">Checkout is not available.</p>
              )}
            </article>
          ))}
        </div>
        <p className="pricing-note">
          Experimental limits may change during beta. No fake subscriptions, no surprise charges.
        </p>
      </main>
      <MarketingFooter />
    </>
  );
}
