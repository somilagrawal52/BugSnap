import { beforeEach, describe, it, expect, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  user: { id: 'user' } as { id: string } | null,
  report: {} as any,
  repository: {} as any,
  claim: {} as any,
  updates: [] as any[],
  create: vi.fn(),
  iterator: vi.fn(),
}));
vi.mock('../apps/web/src/lib/supabase/server', () => {
  const db = {
    auth: { getUser: async () => ({ data: { user: mock.user } }) },
    rpc: async () => ({ data: mock.claim, error: null }),
    from: (name: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        update: (value: any) => {
          mock.updates.push(value);
          return chain;
        },
        single: async () => ({
          data: name === 'reports' ? mock.report : mock.repository,
          error: null,
        }),
        then: (resolve: any) => resolve({ data: null, error: null }),
      };
      return chain;
    },
  };
  return { sessionClient: async () => db, adminClient: () => db };
});
vi.mock('../apps/web/src/lib/github', () => ({
  installationClient: () => ({
    issues: { create: mock.create, listForRepo: vi.fn() },
    paginate: { iterator: mock.iterator },
  }),
}));
import { POST } from '../apps/web/src/app/api/github/export/route';
const reportId = '11111111-1111-4111-8111-111111111111',
  repositoryId = '22222222-2222-4222-8222-222222222222';
const request = (origin = 'https://bugsnap.example') =>
  new Request(origin + '/api/github/export', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId, repositoryId }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'https://bugsnap.example';
  for (const key of [
    'GITHUB_APP_ID',
    'GITHUB_APP_SLUG',
    'GITHUB_PRIVATE_KEY',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_WEBHOOK_SECRET',
  ])
    process.env[key] = 'test-only';
  mock.user = { id: 'user' };
  mock.report = {
    id: reportId,
    organization_id: 'org',
    title: 'Checkout broke',
    reference: 'ACME-1',
    description: 'The checkout click fails',
    steps: 'Click checkout',
    expected: 'Order opens',
    actual: 'Nothing happens',
    context: {
      origin: 'https://acme.example',
      pathname: '/checkout',
      browser: 'Firefox',
      os: 'Linux',
      environment: 'production',
    },
  };
  mock.repository = {
    id: repositoryId,
    organization_id: 'org',
    full_name: 'acme/web',
    github_installations: { installation_id: 123, suspended: false },
  };
  mock.claim = { export: { id: 'export1', status: 'processing' }, claimed: true };
  mock.updates = [];
  mock.create.mockResolvedValue({
    data: { number: 42, html_url: 'https://github.com/acme/web/issues/42' },
  });
  mock.iterator.mockImplementation(async function* () {
    yield { data: [] };
  });
});
describe('GitHub route using mocked GitHub API transport', () => {
  it('creates a real issue payload and saves its link', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mock.create).toHaveBeenCalledOnce();
    expect(mock.create.mock.calls[0][0]).toMatchObject({
      owner: 'acme',
      repo: 'web',
      title: 'Checkout broke',
    });
    expect(mock.create.mock.calls[0][0].body).toContain('<!-- bugsnap-export:export1 -->');
    expect(mock.updates[0]).toMatchObject({ status: 'completed', issue_number: 42 });
  });
  it('does not create a second issue for an existing active claim', async () => {
    mock.claim.claimed = false;
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('returns a retained completed issue without another write', async () => {
    mock.claim = {
      export: {
        id: 'export1',
        status: 'completed',
        issue_url: 'https://github.com/acme/web/issues/42',
      },
      claimed: false,
    };
    const response = await POST(request());
    expect((await response.json()).url).toContain('/42');
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('marks a timeout as uncertain and requires reconciliation', async () => {
    mock.create.mockRejectedValue(new Error('timeout'));
    expect((await POST(request())).status).toBe(502);
    expect(mock.updates[0].status).toBe('needs_reconciliation');
  });
  it.each([403, 404, 422, 429])(
    'records definite GitHub %i rejection as failed',
    async (status) => {
      mock.create.mockRejectedValue({ status });
      await POST(request());
      expect(mock.updates[0].status).toBe('failed');
    },
  );
  it('reconciles an existing stable marker instead of creating', async () => {
    mock.claim = { export: { id: 'export1', status: 'needs_reconciliation' }, claimed: false };
    mock.iterator.mockImplementation(async function* () {
      yield {
        data: [
          {
            body: 'Detail\n<!-- bugsnap-export:export1 -->',
            number: 42,
            html_url: 'https://github.com/acme/web/issues/42',
          },
        ],
      };
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.updates[0].status).toBe('completed');
  });
  it('never interprets marker absence as permission to blindly retry', async () => {
    mock.claim = { export: { id: 'export1', status: 'needs_reconciliation' }, claimed: false };
    expect((await POST(request())).status).toBe(202);
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.updates).toHaveLength(0);
  });
  it('blocks missing sessions, cross-tenant repositories and hostile origins', async () => {
    mock.user = null;
    expect((await POST(request())).status).toBe(401);
    mock.user = { id: 'user' };
    mock.repository.organization_id = 'other';
    expect((await POST(request())).status).toBe(404);
    expect((await POST(request('https://evil.example'))).status).toBe(403);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('blocks suspended installations', async () => {
    mock.repository.github_installations.suspended = true;
    expect((await POST(request())).status).toBe(404);
    expect(mock.create).not.toHaveBeenCalled();
  });
});
