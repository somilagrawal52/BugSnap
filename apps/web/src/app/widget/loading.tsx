import { Loader2 } from 'lucide-react';
export default function LoadingWidget() {
  return (
    <main className="widget-success" role="status">
      <Loader2 className="spin" size={25} />
      <h1>Getting things ready.</h1>
      <p>Loading your bug report form…</p>
    </main>
  );
}
