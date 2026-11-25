'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { normalizeOrigin, projectSchema, statuses, priorities } from '@bugsnap/shared';
import { workspace, assertResult } from '@/lib/workspace';
import { sessionClient } from '@/lib/supabase/server';
import { appUrl, configured, githubConfigured } from '@/lib/env';
import { refreshRepositories } from '@/lib/github';
import { hash } from '@/lib/security';
export type ActionState = { error?: string; success?: string; redirect?: string; link?: string };
const field = (f: FormData, k: string) => String(f.get(k) || '');
function failure(e: unknown): ActionState {
  unstable_rethrow(e);
  if (e instanceof z.ZodError)
    return { error: e.issues[0]?.message || 'Check the form and try again.' };
  const message = e instanceof Error ? e.message : '';
  const lower = message.toLowerCase();
  if (lower.includes('unique') || lower.includes('duplicate key')) {
    if (lower.includes('slug'))
      return { error: 'A project with this slug already exists in this workspace.' };
    return { error: 'An item with this identifier already exists in this workspace.' };
  }
  const allowed = [
    'limit',
    'required',
    'forbidden',
    'origin',
    'https',
    'invitation',
    'verify',
    'password',
    'credentials',
    'registered',
    'email',
    'project unavailable',
    'github',
    'installation',
  ];
  return {
    error: allowed.some((s) => lower.includes(s))
      ? message.slice(0, 220)
      : 'Unable to save. Check your input and try again.',
  };
}
export async function authenticate(
  mode: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    if (!configured()) return { error: 'Connect Supabase first. See the setup guide.' };
    const db = await sessionClient();
    const email = z.email().parse(field(form, 'email'));
    const password = field(form, 'password');
    if (mode === 'reset') {
      assertResult(
        await db.auth.resetPasswordForEmail(email, {
          redirectTo: appUrl() + '/auth/callback?next=/reset-password',
        }),
      );
      return { success: 'If an account exists, a reset link has been sent.' };
    }
    z.string().min(10, 'Password must contain at least 10 characters.').max(128).parse(password);
    if (mode === 'signup') {
      const result = await db.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: appUrl() + '/auth/callback',
          data: { display_name: field(form, 'name').slice(0, 80) },
        },
      });
      assertResult(result);
      return result.data.session
        ? { redirect: '/onboarding' }
        : { success: 'Check your email to verify your account, then sign in.' };
    }
    assertResult(await db.auth.signInWithPassword({ email, password }));
    return { redirect: '/dashboard' };
  } catch (e) {
    return failure(e);
  }
}
export async function resetPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const db = await sessionClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: 'Open the password reset link from your email first.' };
    assertResult(
      await db.auth.updateUser({
        password: z
          .string()
          .min(10, 'Password must contain at least 10 characters.')
          .max(128)
          .parse(field(form, 'password')),
      }),
    );
    return { redirect: '/dashboard' };
  } catch (e) {
    return failure(e);
  }
}
export async function logout() {
  const db = await sessionClient();
  await db.auth.signOut();
  const jar = await cookies();
  jar.delete('bugsnap_workspace');
  jar.delete('bugsnap_github_state');
  const { redirect } = await import('next/navigation');
  redirect('/login');
}
export async function switchWorkspace(form: FormData) {
  const { db, user } = await workspace();
  const id = z.uuid().parse(field(form, 'organization'));
  const { data } = await db
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .eq('organization_id', id)
    .single();
  if (!data) throw new Error('Forbidden');
  (await cookies()).set('bugsnap_workspace', id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  revalidatePath('/dashboard', 'layout');
  const { redirect } = await import('next/navigation');
  redirect('/dashboard');
}
export async function onboard(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const db = await sessionClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { redirect: '/login' };
    const result = await db.rpc('create_workspace', {
      p_name: z.string().trim().min(2).max(80).parse(field(form, 'workspace')),
    });
    assertResult(result);
    if (!result.data) throw new Error('Workspace could not be created or selected.');
    (await cookies()).set('bugsnap_workspace', result.data, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { redirect: '/dashboard/projects/new' };
  } catch (e) {
    return failure(e);
  }
}
export async function saveProject(
  id: string | null,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    const input = projectSchema.parse(
      Object.fromEntries(
        ['name', 'slug', 'environment', 'origin', 'label', 'accent', 'position', 'appVersion'].map(
          (k) => [k, field(form, k)],
        ),
      ),
    );
    const origin = [
      ...new Set(
        input.origin
          .split(/\r?\n/)
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => normalizeOrigin(v, input.environment === 'development')),
      ),
    ].join('\n');
    const result = await db.rpc('save_project', {
      p_org: org.id,
      p_name: input.name,
      p_slug: input.slug,
      p_environment: input.environment,
      p_origin: origin,
      p_id: id,
      p_enabled: form.get('enabled') === 'on',
      p_label: input.label,
      p_accent: input.accent,
      p_position: input.position,
      p_version: input.appVersion,
      p_rotate: form.get('rotate') === 'on',
    });
    assertResult(result);
    revalidatePath('/dashboard', 'layout');
    return { redirect: `/dashboard/projects/${result.data}`, success: 'Project saved' };
  } catch (e) {
    return failure(e);
  }
}
export async function updateReport(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    assertResult(
      await db.rpc('update_report', {
        p_org: org.id,
        p_report: id,
        p_status: z.enum(statuses).parse(field(form, 'status')),
        p_priority: z.enum(priorities).parse(field(form, 'priority')),
        p_assignee: field(form, 'assignee') || null,
      }),
    );
    revalidatePath('/dashboard', 'layout');
    return { success: 'Report updated' };
  } catch (e) {
    return failure(e);
  }
}
export async function addComment(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    assertResult(
      await db.rpc('add_comment', {
        p_org: org.id,
        p_report: id,
        p_body: z.string().trim().min(1).max(5000).parse(field(form, 'body')),
      }),
    );
    revalidatePath(`/dashboard/reports/${id}`);
    return { success: 'Comment added' };
  } catch (e) {
    return failure(e);
  }
}
export async function renameWorkspace(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    assertResult(
      await db.rpc('rename_workspace', {
        p_org: org.id,
        p_name: z.string().trim().min(2).max(80).parse(field(form, 'name')),
      }),
    );
    revalidatePath('/dashboard', 'layout');
    return { success: 'Workspace updated' };
  } catch (e) {
    return failure(e);
  }
}
export async function inviteMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    const token = crypto.randomUUID() + crypto.randomUUID();
    assertResult(
      await db.rpc('invite_member', {
        p_org: org.id,
        p_email: z.email().parse(field(form, 'email')),
        p_role: z.enum(['admin', 'member']).parse(field(form, 'role')),
        p_hash: hash(token),
      }),
    );
    revalidatePath('/dashboard/team');
    return {
      success: 'Invitation created. Share this link with the invited person. It expires in 7 days.',
      link: appUrl() + '/invite?token=' + token,
    };
  } catch (e) {
    return failure(e);
  }
}
export async function acceptInvitation(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const raw = field(form, 'token').trim();
    if (!raw || raw.length !== 72)
      return { error: 'Invalid or missing invitation token. Check the invitation link.' };
    const db = await sessionClient();
    const token = z.string().length(72).parse(raw);
    const result = await db.rpc('accept_invitation', { p_hash: hash(token) });
    assertResult(result);
    if (!result.data) throw new Error('Workspace could not be created or selected.');
    (await cookies()).set('bugsnap_workspace', result.data, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { redirect: '/dashboard' };
  } catch (e) {
    return failure(e);
  }
}
export async function changeMember(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    const role = field(form, 'role');
    assertResult(
      await db.rpc('change_member', {
        p_org: org.id,
        p_user: id,
        p_role: role === 'remove' ? null : z.enum(['admin', 'member']).parse(role),
      }),
    );
    revalidatePath('/dashboard/team');
    return { success: 'Team member updated' };
  } catch (e) {
    return failure(e);
  }
}
export async function selectRepository(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    assertResult(
      await db.rpc('select_repository', {
        p_org: org.id,
        p_repository: id,
        p_selected: form.get('selected') === 'on',
      }),
    );
    revalidatePath('/dashboard/integrations');
    return { success: 'Repository updated' };
  } catch (e) {
    return failure(e);
  }
}
export async function revokeInvitation(
  id: string,
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  try {
    const { db, org } = await workspace();
    assertResult(
      await db.rpc('revoke_invitation', {
        p_org: org.id,
        p_invitation: z.uuid().parse(id),
      }),
    );
    revalidatePath('/dashboard/team');
    return { success: 'Invitation revoked' };
  } catch (e) {
    return failure(e);
  }
}
export async function syncGithubRepositories(
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  try {
    const { db, org, role } = await workspace();
    if (role === 'member') throw new Error('Administrator required');
    if (!githubConfigured()) throw new Error('GitHub App is not configured');
    const installations = await db
      .from('github_installations')
      .select('id,organization_id,installation_id,suspended')
      .eq('organization_id', org.id)
      .eq('suspended', false);
    assertResult(installations);
    if (!installations.data?.length)
      return { error: 'No active GitHub installation found for this workspace.' };
    for (const installation of installations.data) {
      await refreshRepositories(installation);
    }
    revalidatePath('/dashboard/integrations');
    return { success: 'Repositories refreshed from GitHub' };
  } catch (e) {
    return failure(e);
  }
}
