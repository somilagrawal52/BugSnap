'use client';
export default function WidgetError({ reset }: { reset: () => void }) {
  return (
    <main className="widget-success">
      <h1>We couldn’t load the form.</h1>
      <p>Check your connection and try again. Your website will keep working.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
