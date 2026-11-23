import { describe, beforeAll, it, expect, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
const enabled = process.env.LIVE_SUPABASE_TESTS === '1';
if (enabled && existsSync('apps/web/.env.local')) loadEnvFile('apps/web/.env.local');
describe.runIf(enabled)(
  'real local Supabase multi-connection authorization and concurrency',
  () => {
    let admin: SupabaseClient,
      alice: SupabaseClient,
      bob: SupabaseClient,
      member: SupabaseClient,
      orgA: string,
      orgB: string,
      project: string,
      memberId: string,
      report: string;
    const key = crypto.randomUUID();
    const payload = {
      title: 'A real integration report',
      description: 'A persisted report used to verify tenant access.',
      context: { origin: 'https://example.test', pathname: '/checkout' },
    };
    const submit = (id = crypto.randomUUID()) =>
      admin.rpc('submit_report', {
        p_project: project,
        p_key: id,
        p_hash: 'live-test',
        p_data: payload,
      });
    beforeAll(async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
        throw new Error('Live tests only support a local Supabase stack.');
      admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      });
      const clients: SupabaseClient[] = [];
      for (const name of ['alice', 'bob', 'member']) {
        const email = `live-${name}-${Date.now()}@example.test`,
          password = crypto.randomUUID() + crypto.randomUUID();
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(created.error).toBeNull();
        const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false },
        });
        expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
        clients.push(client);
        if (name === 'member') memberId = created.data.user!.id;
      }
      [alice, bob, member] = clients;
      const a = await alice.rpc('create_workspace', { p_name: 'Live SQL Workspace A' }),
        b = await bob.rpc('create_workspace', { p_name: 'Live SQL Workspace B' });
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      orgA = a.data;
      orgB = b.data;
      const p = await alice.rpc('save_project', {
        p_org: orgA,
        p_name: 'Live integration',
        p_slug: 'live-app',
        p_environment: 'production',
        p_origin: 'https://example.test',
      });
      expect(p.error).toBeNull();
      project = p.data;
      const insert = await admin
        .from('organization_members')
        .insert({ organization_id: orgA, user_id: memberId, role: 'member' });
      expect(insert.error).toBeNull();
      const result = await submit(key);
      expect(result.error).toBeNull();
      report = result.data.id;
    });
    afterAll(async () => {
      await Promise.all([alice, bob, member].map((c) => c?.auth.signOut()));
    });
    it('RLS blocks another organization and anonymous direct reads', async () => {
      expect((await bob.from('reports').select('*').eq('id', report)).data).toEqual([]);
      expect((await bob.from('projects').select('*').eq('id', project)).data).toEqual([]);
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      expect((await anon.from('reports').select('*')).error).not.toBeNull();
      expect(
        (
          await bob.rpc('update_report', {
            p_org: orgA,
            p_report: report,
            p_status: 'triaged',
            p_priority: 'high',
            p_assignee: null,
          })
        ).error,
      ).not.toBeNull();
      expect((await alice.rpc('workspace_metrics', { p_org: orgB })).error).not.toBeNull();
    });
    it('parallel real HTTP requests allocate unique references and deduplicate one key', async () => {
      const duplicate = await Promise.all(Array.from({ length: 8 }, () => submit(key)));
      expect(duplicate.every((r) => !r.error && r.data.id === report)).toBe(true);
      const results = await Promise.all(Array.from({ length: 12 }, () => submit()));
      expect(results.every((r) => !r.error)).toBe(true);
      expect(new Set(results.map((r) => r.data.reference)).size).toBe(12);
    });
    it('concurrent quota races admit exactly one final report', async () => {
      expect(
        (await admin.from('usage_daily').update({ reports: 49 }).eq('organization_id', orgA)).error,
      ).toBeNull();
      const results = await Promise.all(Array.from({ length: 12 }, () => submit()));
      expect(results.filter((r) => !r.error)).toHaveLength(1);
      expect(results.filter((r) => r.error?.message.includes('Monthly report limit'))).toHaveLength(
        11,
      );
      const usage = await admin
        .from('usage_daily')
        .select('reports')
        .eq('organization_id', orgA)
        .single();
      expect(usage.data?.reports).toBe(50);
      expect((await submit(key)).data.duplicate).toBe(true);
    });
    it('archival revokes access and disallows inactive assignments', async () => {
      expect(
        (
          await member.rpc('add_comment', {
            p_org: orgA,
            p_report: report,
            p_body: 'A historical comment survives revocation.',
          })
        ).error,
      ).toBeNull();
      expect(
        (await alice.rpc('change_member', { p_org: orgA, p_user: memberId, p_role: null })).error,
      ).toBeNull();
      expect((await member.from('reports').select('*')).data).toEqual([]);
      expect(
        (await alice.from('report_comments').select('*').eq('report_id', report)).data,
      ).toHaveLength(1);
      expect(
        (
          await alice.rpc('update_report', {
            p_org: orgA,
            p_report: report,
            p_status: 'triaged',
            p_priority: 'high',
            p_assignee: memberId,
          })
        ).error,
      ).not.toBeNull();
    });
  },
);
