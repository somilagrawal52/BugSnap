import { isValidDateString, priorities, statuses } from '@bugsnap/shared';

export const sortOptions = ['newest', 'oldest', 'priority', 'updated'] as const;
export type ReportSort = (typeof sortOptions)[number];

export interface ReportFilterParams {
  q: string;
  status?: (typeof statuses)[number];
  priority?: (typeof priorities)[number];
  project?: string;
  assignee?: string;
  from?: string;
  to?: string;
  sort: ReportSort;
  page: number;
}

export function parseReportFilters(
  raw: Record<string, string | undefined>,
): ReportFilterParams {
  const q = (raw.q || '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .slice(0, 120);
  const status = statuses.find((v) => v === raw.status);
  const priority = priorities.find((v) => v === raw.priority);
  const project =
    raw.project && /^[a-f0-9-]{36}$/.test(raw.project) ? raw.project : undefined;
  const assignee =
    raw.assignee === 'unassigned'
      ? 'unassigned'
      : raw.assignee && /^[a-f0-9-]{36}$/.test(raw.assignee)
        ? raw.assignee
        : undefined;
  const from = raw.from && isValidDateString(raw.from) ? raw.from : undefined;
  const to = raw.to && isValidDateString(raw.to) ? raw.to : undefined;
  const sort = sortOptions.find((v) => v === raw.sort) || 'newest';
  const page = Math.floor(Math.max(1, Math.min(100000, Number(raw.page) || 1)));
  return { q, status, priority, project, assignee, from, to, sort, page };
}

export function applyReportFilters<T extends {
  or: (filter: string) => T;
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  order: (column: string, options: { ascending: boolean }) => T;
}>(query: T, filters: ReportFilterParams): T {
  let next = query;
  if (filters.q)
    next = next.or(
      `reference.ilike.%${filters.q}%,title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`,
    );
  if (filters.status) next = next.eq('status', filters.status);
  if (filters.priority) next = next.eq('priority', filters.priority);
  if (filters.project) next = next.eq('project_id', filters.project);
  if (filters.assignee === 'unassigned') next = next.is('assignee_id', null);
  else if (filters.assignee) next = next.eq('assignee_id', filters.assignee);
  if (filters.from) next = next.gte('created_at', filters.from);
  if (filters.to) next = next.lte('created_at', filters.to + 'T23:59:59.999Z');

  if (filters.sort === 'oldest') {
    next = next.order('created_at', { ascending: true });
  } else if (filters.sort === 'priority') {
    next = next
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
  } else if (filters.sort === 'updated') {
    next = next.order('updated_at', { ascending: false });
  } else {
    next = next.order('created_at', { ascending: false });
  }
  return next;
}
