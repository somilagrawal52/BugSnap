import { WidgetForm } from '@/components/widget-form';
import { adminClient } from '@/lib/supabase/server';
export default async function Widget({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; host?: string; channel?: string }>;
}) {
  const { key, host, channel } = await searchParams;
  let allowed = false;
  try {
    if (
      !key ||
      !host ||
      !channel ||
      !/^bs_[a-f0-9]{32}$/.test(key) ||
      !/^[a-f0-9-]{36}$/.test(channel)
    )
      throw new Error();
    const origin = new URL(host).origin;
    if (origin !== host) throw new Error();
    const { data } = await adminClient()
      .from('projects')
      .select('enabled,project_domains(origin)')
      .eq('public_key', key)
      .single();
    allowed =
      !!data?.enabled && data.project_domains.some((d: { origin: string }) => d.origin === host);
  } catch {
    /* Render a configuration failure below. */
  }
  return allowed && host && channel ? (
    <WidgetForm host={host} channel={channel} />
  ) : (
    <main className="widget-unavailable">
      <h2>Widget unavailable</h2>
      <p>This project isn’t configured for this website. Contact the website owner.</p>
    </main>
  );
}
