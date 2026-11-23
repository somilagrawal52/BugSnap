import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { configured } from './env';
import { sessionClient } from './supabase/server';
export async function workspace() {
  if (!configured()) redirect('/setup');
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  const result = await db
    .from('organization_members')
    .select('organization_id,role,organizations(id,name,plan)')
    .eq('user_id', user.id)
    .order('created_at');
  if (result.error) throw new Error('Workspace unavailable. Check the database migrations.');
  if (!result.data?.length) redirect('/onboarding');
  const selected = (await cookies()).get('bugsnap_workspace')?.value;
  const membership = result.data.find((m) => m.organization_id === selected) || result.data[0];
  const org = (Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations) as unknown as {
    id: string;
    name: string;
    plan: 'free' | 'starter' | 'team';
  };
  return {
    db,
    user,
    org,
    role: membership.role as 'owner' | 'admin' | 'member',
    memberships: result.data,
  };
}
export function assertResult(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}
