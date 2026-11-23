import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionClient, adminClient } from '@/lib/supabase/server';
import { installationClient } from '@/lib/github';
import { issueBody, exportMarker, uncertainGithubFailure } from '@/lib/github-content';
import { sameOrigin, boundedBody } from '@/lib/security';
import { appUrl, githubConfigured } from '@/lib/env';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  if (!githubConfigured())
    return NextResponse.json({ error: 'GitHub App is not configured' }, { status: 503 });
  let exportId: string | undefined;
  let writeStarted = false;
  try {
    const db = await sessionClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const input = z
      .object({ reportId: z.uuid(), repositoryId: z.uuid() })
      .parse(JSON.parse((await boundedBody(request, 2048)).toString()));
    const [report, repository] = await Promise.all([
      db.from('reports').select('*').eq('id', input.reportId).single(),
      db
        .from('github_repositories')
        .select('*,github_installations(*)')
        .eq('id', input.repositoryId)
        .eq('enabled', true)
        .eq('selected', true)
        .single(),
    ]);
    if (
      !report.data ||
      !repository.data ||
      report.data.organization_id !== repository.data.organization_id ||
      repository.data.github_installations.suspended
    )
      return NextResponse.json({ error: 'Report or repository unavailable' }, { status: 404 });
    const claim = await db.rpc('claim_export', {
      p_org: report.data.organization_id,
      p_report: input.reportId,
      p_repository: input.repositoryId,
    });
    if (claim.error) throw claim.error;
    const record = claim.data.export;
    exportId = record.id;
    if (record.status === 'completed')
      return NextResponse.json({ message: 'Already exported', url: record.issue_url });
    const github = installationClient(repository.data.github_installations.installation_id);
    const [owner, repo] = repository.data.full_name.split('/');
    if (record.status === 'needs_reconciliation') {
      // Read all issue pages, including closed issues. Absence is never proof an uncertain write failed.
      let found: { number: number; html_url: string } | undefined;
      for await (const page of github.paginate.iterator(github.issues.listForRepo, {
        owner,
        repo,
        state: 'all',
        per_page: 100,
      })) {
        found = page.data.find((issue) => issue.body?.includes(exportMarker(record.id)));
        if (found) break;
      }
      if (found) {
        await adminClient()
          .from('github_exports')
          .update({
            status: 'completed',
            issue_number: found.number,
            issue_url: found.html_url,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);
        return NextResponse.json({ message: 'Existing issue reconciled', url: found.html_url });
      }
      return NextResponse.json(
        {
          message:
            'No matching issue found yet. Export remains paused to prevent a duplicate. Check GitHub, then retry reconciliation.',
        },
        { status: 202 },
      );
    }
    if (!claim.data.claimed)
      return NextResponse.json(
        { message: 'An export is already processing. Check again shortly.' },
        { status: 202 },
      );
    writeStarted = true;
    const issue = await github.issues.create({
      owner,
      repo,
      title: report.data.title,
      body: issueBody(report.data, appUrl(), record.id),
    });
    const saved = await adminClient()
      .from('github_exports')
      .update({
        status: 'completed',
        issue_number: issue.data.number,
        issue_url: issue.data.html_url,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);
    if (saved.error) throw saved.error;
    return NextResponse.json({ message: 'Issue created in GitHub', url: issue.data.html_url });
  } catch (error) {
    if (exportId && writeStarted) {
      const uncertain = uncertainGithubFailure(error);
      await adminClient()
        .from('github_exports')
        .update({
          status: uncertain ? 'needs_reconciliation' : 'failed',
          last_error: uncertain
            ? 'GitHub result is uncertain; reconcile before retrying.'
            : 'GitHub rejected the request. Check repository access and rate limits.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', exportId)
        .eq('status', 'processing');
    }
    return NextResponse.json(
      {
        error:
          'Could not complete export. Check repository access, rate limits, and the export status before retrying.',
      },
      { status: 502 },
    );
  }
}
