import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createClient } from '../apps/web/node_modules/@supabase/supabase-js';
if (existsSync('apps/web/.env.local')) loadEnvFile('apps/web/.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anon || !secret) throw new Error('Configure Supabase before seeding.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(url).hostname) &&
  process.env.SEED_ALLOW_REMOTE !== 'true'
)
  throw new Error(
    'Remote seeding is disabled. Use a dedicated development Supabase project and set SEED_ALLOW_REMOTE=true explicitly.',
  );
const email = process.env.SEED_EMAIL || 'demo@example.test',
  password = process.env.SEED_PASSWORD;
if (!password || password.length < 12)
  throw new Error(
    'Set a unique SEED_PASSWORD of at least 12 characters. Never share this owner account with visitors.',
  );
const admin = createClient(url, secret, { auth: { persistSession: false } }),
  user = createClient(url, anon, { auth: { persistSession: false } });
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: 'Alex Morgan' },
});
if (created.error && !created.error.message.includes('already')) throw created.error;
const login = await user.auth.signInWithPassword({ email, password });
if (login.error) throw login.error;
const existing = await user
  .from('organization_members')
  .select('organization_id,organizations(name)')
  .eq('user_id', login.data.user.id);
let org = (existing.data || []).find(
  (m: any) => m.organizations.name === 'Acme Labs',
)?.organization_id;
if (!org) {
  const result = await user.rpc('create_workspace', { p_name: 'Acme Labs' });
  if (result.error) throw result.error;
  org = result.data;
}
// Explicit fictional development tenant: two projects exceed the normal Free entitlement.
await admin.from('organizations').update({ plan: 'team' }).eq('id', org);
const bugs = [
  [
    'Checkout button does not respond',
    'Clicking the checkout button leaves the cart unchanged.',
    'high',
  ],
  [
    'Mobile navigation overlaps page content',
    'At a narrow viewport the expanded menu overlaps the main content.',
    'medium',
  ],
  [
    'Avatar upload fails on Safari',
    'Selecting a JPEG avatar produces a blank preview in Safari.',
    'high',
  ],
  [
    'Incorrect validation message',
    'An invalid email shows the password validation message.',
    'low',
  ],
  [
    'Dashboard loading indicator never disappears',
    'After the dashboard data loads, the spinner remains visible.',
    'critical',
  ],
];
for (const [index, name] of ['Acme Dashboard', 'Acme Checkout'].entries()) {
  const slug = index ? 'acme-checkout' : 'acme-dashboard';
  const found = await user
    .from('projects')
    .select('id,public_key')
    .eq('organization_id', org)
    .eq('slug', slug)
    .maybeSingle();
  let id = found.data?.id;
  if (!id) {
    const result = await user.rpc('save_project', {
      p_org: org,
      p_name: name,
      p_slug: slug,
      p_environment: 'development',
      p_origin: 'http://localhost:3000',
    });
    if (result.error) throw result.error;
    id = result.data;
  }
  for (const [i, [title, description, priority]] of bugs.entries()) {
    if ((i === 0) !== !!index) continue;
    const key = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
    const result = await admin.rpc('submit_report', {
      p_project: id,
      p_key: key,
      p_hash: `demo-v1-${i}`,
      p_data: {
        title,
        description,
        steps: 'Open the demo application. Navigate to the affected page and repeat the action.',
        expected: 'The application completes the action.',
        actual: description,
        context: {
          origin: 'http://localhost:3000',
          pathname: index ? '/checkout' : '/dashboard',
          browser: i === 2 ? 'Safari 18' : 'Chrome 132',
          os: 'macOS',
          viewport: { width: 1440, height: 900 },
          timestamp: new Date().toISOString(),
        },
      },
    });
    if (result.error) throw result.error;
    const triage = await user.rpc('update_report', {
      p_org: org,
      p_report: result.data.id,
      p_status: i === 1 ? 'resolved' : i === 2 ? 'in_progress' : 'new',
      p_priority: priority,
      p_assignee: null,
    });
    if (triage.error) throw triage.error;
  }
  const project = await user.from('projects').select('public_key').eq('id', id).single();
  console.log(`${name}: ${project.data?.public_key}`);
}
await user.auth.signOut();
console.log('Development Acme Labs seed complete. Owner credentials were not printed.');
