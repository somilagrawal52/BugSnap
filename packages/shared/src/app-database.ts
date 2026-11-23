import type { Database as Generated } from './database.types';
import type { Report } from './index';
type Schema = Generated['public'];
type Tables = Schema['Tables'];
type Functions = Schema['Functions'];
export interface WorkspaceMetrics {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  week: number;
  priorities: { name: string; value: number }[];
  projects: { name: string; value: number }[];
  trend: { day: string; reports: number }[];
}
export type ExportRecord = Tables['github_exports']['Row'];
type Returns<K extends keyof Functions, T> = Omit<Functions[K], 'Returns'> & { Returns: T };
// PostgreSQL jsonb and nullable DEFAULT arguments do not convey domain contracts
// to the CLI generator. These refinements match the checked SQL RPCs/schemas.
export type AppDatabase = Omit<Generated, 'public'> & {
  public: Omit<Schema, 'Tables' | 'Functions'> & {
    Tables: Omit<Tables, 'reports' | 'report_events'> & {
      reports: Omit<Tables['reports'], 'Row'> & {
        Row: Omit<Tables['reports']['Row'], 'context'> & { context: Report['context'] };
      };
      report_events: Omit<Tables['report_events'], 'Row'> & {
        Row: Omit<Tables['report_events']['Row'], 'details'> & {
          details: {
            before: { status: string };
            after: { status: string; priority: string; assignee: string | null };
          };
        };
      };
    };
    Functions: Omit<
      Functions,
      | 'workspace_metrics'
      | 'submit_report'
      | 'claim_export'
      | 'save_project'
      | 'update_report'
      | 'change_member'
    > & {
      workspace_metrics: Returns<'workspace_metrics', WorkspaceMetrics>;
      submit_report: Returns<
        'submit_report',
        { id: string; reference: string; duplicate: boolean }
      >;
      claim_export: Returns<'claim_export', { export: ExportRecord; claimed: boolean }>;
      save_project: Omit<Functions['save_project'], 'Args'> & {
        Args: Omit<Functions['save_project']['Args'], 'p_id'> & { p_id?: string | null };
      };
      update_report: Omit<Functions['update_report'], 'Args'> & {
        Args: Omit<Functions['update_report']['Args'], 'p_assignee'> & {
          p_assignee?: string | null;
        };
      };
      change_member: Omit<Functions['change_member'], 'Args'> & {
        Args: Omit<Functions['change_member']['Args'], 'p_role'> & {
          p_role?: 'owner' | 'admin' | 'member' | null;
        };
      };
    };
  };
};
