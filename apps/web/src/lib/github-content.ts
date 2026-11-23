import type { Report } from '@bugsnap/shared';
export const exportMarker = (id: string) => `<!-- bugsnap-export:${id} -->`;
export function issueBody(report: Report, url: string, exportId: string) {
  return [
    report.description,
    report.steps && `## Steps to reproduce\n${report.steps}`,
    report.expected && `## Expected behavior\n${report.expected}`,
    report.actual && `## Actual behavior\n${report.actual}`,
    `## Technical context\n- Page: ${report.context.origin}${report.context.pathname}\n- Browser: ${report.context.browser}\n- OS: ${report.context.os}\n- Environment: ${report.context.environment}`,
    `## BugSnap\nReport ${report.reference}\n[Open private report](${url}/dashboard/reports/${report.id})\n\nScreenshots require authorized BugSnap workspace access.`,
    exportMarker(exportId),
  ]
    .filter(Boolean)
    .join('\n\n');
}
export function uncertainGithubFailure(error: unknown) {
  const status = (error as { status?: number })?.status;
  return !status || status >= 500 || status === 408;
}
