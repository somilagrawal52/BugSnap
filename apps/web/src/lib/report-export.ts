import { label, type Report } from '@bugsnap/shared';

export type ExportableReport = Report & {
  projects?: { name: string } | null;
  assignee?: { display_name: string } | null;
};

/** Neutralize spreadsheet formula triggers before RFC 4180 quoting. */
export function csvCell(value: string | null | undefined): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function reportsToCsv(rows: ExportableReport[]): string {
  const header = [
    'Reference',
    'Title',
    'Project',
    'Status',
    'Priority',
    'Assignee',
    'Reporter Email',
    'Page',
    'Browser',
    'OS',
    'Environment',
    'App Version',
    'Created At (UTC)',
    'Updated At (UTC)',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.reference,
        r.title,
        r.projects?.name || '',
        label(r.status),
        label(r.priority),
        r.assignee_id ? r.assignee?.display_name || 'Teammate' : 'Unassigned',
        r.reporter_email || '',
        `${r.context?.origin || ''}${r.context?.pathname || ''}`,
        r.context?.browser || '',
        r.context?.os || '',
        r.context?.environment || '',
        r.context?.appVersion || '',
        r.created_at,
        r.updated_at,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n');
}

export function reportToMarkdown(
  report: Report & { projects?: { name: string } | null },
): string {
  const lines = [
    `# [${report.reference}] ${report.title}`,
    `**Project:** ${report.projects?.name || 'Project'} · **Status:** ${label(report.status)} · **Priority:** ${label(report.priority)}`,
    '',
    '## Description',
    report.description,
  ];
  if (report.steps) lines.push('', '## Steps to reproduce', report.steps);
  if (report.expected) lines.push('', '## Expected behavior', report.expected);
  if (report.actual) lines.push('', '## Actual behavior', report.actual);
  lines.push(
    '',
    '## Technical context',
    `- **Page:** ${report.context?.origin || ''}${report.context?.pathname || ''}`,
    `- **Browser / OS:** ${report.context?.browser || 'Unknown'} · ${report.context?.os || 'Unknown'}`,
    `- **Viewport:** ${report.context?.viewport?.width ?? '?'} × ${report.context?.viewport?.height ?? '?'}`,
    `- **Environment:** ${report.context?.environment || 'unknown'}${report.context?.appVersion ? ` (v${report.context.appVersion})` : ''}`,
    `- **Submitted:** ${report.created_at}`,
  );
  return lines.join('\n');
}
