import { z } from 'zod';
export type { Database, Json } from './database.types';
export type { AppDatabase, WorkspaceMetrics } from './app-database';
export const statuses = ['new', 'triaged', 'in_progress', 'resolved', 'closed'] as const;
export const priorities = ['low', 'medium', 'high', 'critical'] as const;
export const plans = {
  free: { projects: 1, reports: 50 },
  starter: { projects: 3, reports: 500 },
  team: { projects: 10, reports: 2000 },
} as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const contextSchema = z
  .object({
    origin: z.url().max(300),
    pathname: z
      .string()
      .startsWith('/')
      .max(1500)
      .refine((v) => !/[?#]/.test(v)),
    browser: z.string().max(80),
    os: z.string().max(80),
    viewport: z.object({
      width: z.number().int().min(0).max(20000),
      height: z.number().int().min(0).max(20000),
    }),
    timestamp: z.iso.datetime(),
    appVersion: z.string().max(80).optional(),
  })
  .strict();
export const reportSchema = z
  .object({
    title: z.string().trim().min(3, 'Use at least 3 characters.').max(180),
    description: z.string().trim().min(10, 'Add at least 10 characters of detail.').max(10000),
    steps: z.string().max(5000).default(''),
    expected: z.string().max(3000).default(''),
    actual: z.string().max(3000).default(''),
    email: z.union([z.email().max(254), z.literal('')]).optional(),
    context: contextSchema,
    website: z.string().max(0).optional(),
    turnstileToken: z.string().max(3000).optional(),
  })
  .strict();
export const projectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,49}$/),
  environment: z.enum(['production', 'staging', 'development']),
  origin: z.string().max(3000),
  label: z.string().min(1).max(40),
  accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  position: z.enum(['bottom-right', 'bottom-left']),
  appVersion: z.string().max(80).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;
export type SafeContext = z.infer<typeof contextSchema>;
export type ReportStatus = (typeof statuses)[number];
export type ReportPriority = (typeof priorities)[number];
export interface Report {
  id: string;
  organization_id: string;
  project_id: string;
  reference: string;
  title: string;
  description: string;
  steps: string;
  expected: string;
  actual: string;
  reporter_email: string | null;
  context: SafeContext & { environment: string };
  status: ReportStatus;
  priority: ReportPriority;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  environment: string;
  public_key: string;
  enabled: boolean;
  created_at: string;
}
export function safeLocation(value: string) {
  const url = new URL(value);
  return { origin: url.origin, pathname: url.pathname };
}
export function normalizeOrigin(value: string, development = false) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid URL origin including scheme (e.g. https://app.example.com)');
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new Error('Enter an origin without a path, query, or credentials.');
  if (
    url.protocol !== 'https:' &&
    !(development && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  )
    throw new Error('Use HTTPS, or localhost in development.');
  return url.origin;
}
export const label = (v?: string | null) =>
  (v || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
