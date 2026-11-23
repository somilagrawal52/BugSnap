import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111',
  bob = '22222222-2222-4222-8222-222222222222',
  member = '33333333-3333-4333-8333-333333333333';
let orgA: string,
  orgB: string,
  projectA: string,
  projectB: string,
  reportId: string,
  repository: string;
async function asUser(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function service() {
  await db.exec('reset role; set role service_role;');
}
async function scalar(sql: string, params: any[] = []) {
  return (await db.query<any>(sql, params)).rows[0];
}
const payload = {
  title: 'Checkout button is broken',
  description: 'Clicking checkout does not respond.',
  context: { origin: 'https://acme.example', pathname: '/checkout' },
};
const submit = (project: string, key = crypto.randomUUID(), content = payload) =>
  scalar('select public.submit_report($1,$2,$3,$4::jsonb) as result', [
    project,
    key,
    'hash',
    JSON.stringify(content),
  ]);
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  for (const file of readdirSync('supabase/migrations').sort())
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)', [
    alice,
    'alice@example.test',
    bob,
    'bob@example.test',
    member,
    'member@example.test',
  ]);
  await asUser(alice);
  orgA = (await scalar("select public.create_workspace('Acme Labs') as id")).id;
  projectA = (
    await scalar(
      "select public.save_project($1,'Acme Dashboard','dashboard','production','https://acme.example') as id",
      [orgA],
    )
  ).id;
  await asUser(bob);
  orgB = (await scalar("select public.create_workspace('Other Labs') as id")).id;
  projectB = (
    await scalar(
      "select public.save_project($1,'Other Dashboard','other','production','https://other.example') as id",
      [orgB],
    )
  ).id;
  await service();
  await db.query(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'member')",
    [orgA, member],
  );
  reportId = (await submit(projectA)).result.id;
  const installation = await scalar(
    "insert into public.github_installations(organization_id,installation_id,account_login) values($1,100,'acme') returning id",
    [orgA],
  );
  repository = (
    await scalar(
      "insert into public.github_repositories(organization_id,installation_id,github_id,full_name,selected) values($1,$2,200,'acme/web',true) returning id",
      [orgA, installation.id],
    )
  ).id;
});
afterAll(async () => await db.close());
describe('clean PostgreSQL migrations and tenant boundaries', () => {
  it('enables RLS on every exposed table', async () => {
    await service();
    const tables = await db.query<any>(
      "select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'",
    );
    expect(tables.rows.length).toBe(17);
    expect(tables.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  it('denies anonymous report reads and submissions', async () => {
    await db.exec('reset role;set role anon;');
    await expect(db.query('select * from public.reports')).rejects.toThrow(/permission denied/);
    await expect(submit(projectA)).rejects.toThrow(/permission denied/);
  });
  it('members cannot read another organization', async () => {
    await asUser(bob);
    expect(
      (await db.query('select * from public.reports where id=$1', [reportId])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select * from public.projects where id=$1', [projectA])).rows,
    ).toHaveLength(0);
    expect((await db.query('select * from public.github_installations')).rows).toHaveLength(0);
  });
  it('hides private attachments across workspaces', async () => {
    await service();
    await db.query(
      "insert into public.report_attachments(organization_id,report_id,object_path,mime_type,size_bytes) values($1,$2,$3,'image/webp',100)",
      [orgA, reportId, orgA + '/test.webp'],
    );
    await asUser(bob);
    expect((await db.query('select * from public.report_attachments')).rows).toHaveLength(0);
    await asUser(member);
    expect((await db.query('select * from public.report_attachments')).rows).toHaveLength(1);
  });
  it('rejects cross-workspace assignments and report mutations', async () => {
    await asUser(alice);
    await expect(
      db.query("select public.update_report($1,$2,'triaged','high',$3)", [orgA, reportId, bob]),
    ).rejects.toThrow(/foreign key|active workspace member/);
    await asUser(bob);
    await expect(
      db.query("select public.update_report($1,$2,'triaged','high',null)", [orgA, reportId]),
    ).rejects.toThrow(/Membership required/);
  });
  it('members cannot manage roles or create projects', async () => {
    await asUser(member);
    await expect(
      db.query("select public.change_member($1,$2,'admin')", [orgA, member]),
    ).rejects.toThrow(/forbidden/);
    await expect(
      db.query(
        "select public.save_project($1,'New app','new-app','production','https://example.com')",
        [orgA],
      ),
    ).rejects.toThrow(/Administrator required/);
  });
  it('owners cannot be demoted', async () => {
    await asUser(alice);
    await expect(
      db.query("select public.change_member($1,$2,'member')", [orgA, alice]),
    ).rejects.toThrow(/forbidden/);
  });
  it('allows member triage and comments and records events', async () => {
    await asUser(member);
    await db.query("select public.update_report($1,$2,'in_progress','critical',$3)", [
      orgA,
      reportId,
      member,
    ]);
    await db.query("select public.add_comment($1,$2,'Investigating the click handler')", [
      orgA,
      reportId,
    ]);
    expect((await scalar('select status from reports where id=$1', [reportId])).status).toBe(
      'in_progress',
    );
    expect(
      (await db.query('select * from report_events where report_id=$1', [reportId])).rows.length,
    ).toBe(3);
  });
  it('enforces project quota and does not trust client plan changes', async () => {
    await asUser(alice);
    await expect(
      db.query(
        "select public.save_project($1,'Second app','second-app','production','https://example.com')",
        [orgA],
      ),
    ).rejects.toThrow(/Project limit/);
    await expect(
      db.query("update organizations set plan='team' where id=$1", [orgA]),
    ).rejects.toThrow(/permission denied/);
  });
  it('email-bound invitations cannot be accepted by another identity', async () => {
    await asUser(alice);
    await db.query(
      "select public.invite_member($1,'member@example.test','member','test-invite-hash')",
      [orgA],
    );
    await asUser(bob);
    await expect(db.query("select public.accept_invitation('test-invite-hash')")).rejects.toThrow(
      /Invitation unavailable/,
    );
    await asUser(member);
    expect((await scalar("select public.accept_invitation('test-invite-hash') as id")).id).toBe(
      orgA,
    );
  });
});
describe('transactional ingestion', () => {
  it('repeated request keys create only one report and one usage increment', async () => {
    await service();
    const key = crypto.randomUUID();
    const one = await submit(projectA, key),
      two = await submit(projectA, key);
    expect(two.result.id).toBe(one.result.id);
    expect(two.result.duplicate).toBe(true);
    expect(
      (await scalar('select count(*)::int as n from reports where idempotency_key=$1', [key])).n,
    ).toBe(1);
  });
  it('rejects changed payloads using an existing key', async () => {
    await service();
    const key = crypto.randomUUID();
    await submit(projectA, key);
    await expect(
      db.query('select public.submit_report($1,$2,$3,$4::jsonb)', [
        projectA,
        key,
        'different-hash',
        JSON.stringify(payload),
      ]),
    ).rejects.toThrow(/Idempotency/);
  });
  it('rejects missing and disabled projects', async () => {
    await service();
    await expect(submit(crypto.randomUUID())).rejects.toThrow(/Project unavailable/);
    await db.query('update projects set enabled=false where id=$1', [projectB]);
    await expect(submit(projectB)).rejects.toThrow(/Project unavailable/);
  });
  it('failed constraints roll back references and quota', async () => {
    await service();
    const before = await scalar('select report_counter from projects where id=$1', [projectA]);
    await expect(submit(projectA, crypto.randomUUID(), { ...payload, title: 'x' })).rejects.toThrow(
      /check constraint/,
    );
    const after = await scalar('select report_counter from projects where id=$1', [projectA]);
    expect(after.report_counter).toBe(before.report_counter);
  });
  it('allocates unique references for concurrent queued submissions', async () => {
    await service();
    const results = await Promise.all(Array.from({ length: 10 }, () => submit(projectA)));
    expect(new Set(results.map((r) => r.result.reference)).size).toBe(10);
  });
  it('enforces rate counters across callers', async () => {
    await service();
    expect((await scalar("select consume_rate('test-rate',1,60) as ok")).ok).toBe(true);
    expect((await scalar("select consume_rate('test-rate',1,60) as ok")).ok).toBe(false);
  });
  it('monthly limits reject new reports but allow prior idempotent retries', async () => {
    await service();
    const key = crypto.randomUUID();
    await submit(projectA, key);
    await db.query('update usage_daily set reports=50 where organization_id=$1', [orgA]);
    await expect(submit(projectA)).rejects.toThrow(/Monthly report limit/);
    expect((await submit(projectA, key)).result.duplicate).toBe(true);
    expect(
      (await scalar('select reports from usage_daily where organization_id=$1', [orgA])).reports,
    ).toBe(50);
  });
});
describe('GitHub export state machine', () => {
  it('only the first request claims an export', async () => {
    await asUser(member);
    const first = (
      await scalar('select claim_export($1,$2,$3) as result', [orgA, reportId, repository])
    ).result;
    const second = (
      await scalar('select claim_export($1,$2,$3) as result', [orgA, reportId, repository])
    ).result;
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(false);
    expect(first.export.id).toBe(second.export.id);
  });
  it('stale processing transitions to reconciliation, never blindly reclaims', async () => {
    await service();
    await db.exec(
      "reset role; alter table github_exports disable trigger set_updated_at; update github_exports set updated_at=now()-interval '3 minutes'; alter table github_exports enable trigger set_updated_at;",
    );
    await asUser(member);
    const claim = (
      await scalar('select claim_export($1,$2,$3) as result', [orgA, reportId, repository])
    ).result;
    expect(claim.export.status).toBe('needs_reconciliation');
    expect(claim.claimed).toBe(false);
  });
  it('blocks cross-workspace exports', async () => {
    await asUser(bob);
    await expect(
      db.query('select claim_export($1,$2,$3)', [orgA, reportId, repository]),
    ).rejects.toThrow(/Membership required/);
  });
  it('removed repository access blocks export', async () => {
    await service();
    await db.query('update github_repositories set enabled=false where id=$1', [repository]);
    await asUser(member);
    await expect(
      db.query('select claim_export($1,$2,$3)', [orgA, reportId, repository]),
    ).rejects.toThrow(/Repository unavailable/);
  });
  it('metrics respect workspace isolation', async () => {
    await asUser(member);
    expect(
      (await scalar('select workspace_metrics($1) as result', [orgA])).result.total,
    ).toBeGreaterThan(0);
    await expect(db.query('select workspace_metrics($1)', [orgB])).rejects.toThrow(
      /Membership required/,
    );
  });
});
describe('membership archival', () => {
  it('revokes a historical author without deleting comments', async () => {
    await asUser(alice);
    await db.query('select change_member($1,$2,null)', [orgA, member]);
    expect(
      (await db.query('select * from report_comments where report_id=$1', [reportId])).rows,
    ).toHaveLength(1);
    await asUser(member);
    expect((await db.query('select * from reports')).rows).toHaveLength(0);
    await expect(
      db.query("select add_comment($1,$2,'No longer allowed')", [orgA, reportId]),
    ).rejects.toThrow(/Membership required/);
  });
  it('rejects assignment to a removed member', async () => {
    await asUser(alice);
    await expect(
      db.query("select update_report($1,$2,'triaged','high',$3)", [orgA, reportId, member]),
    ).rejects.toThrow(/active workspace member/);
  });
  it('can reactivate through a new verified email-bound invitation', async () => {
    await asUser(alice);
    await db.query("select invite_member($1,'member@example.test','member','reactivate-hash')", [
      orgA,
    ]);
    await asUser(member);
    await db.query("select accept_invitation('reactivate-hash')");
    expect((await db.query('select * from reports')).rows.length).toBeGreaterThan(0);
  });
});
