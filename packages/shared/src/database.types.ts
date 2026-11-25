export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: string;
          organization_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      github_exports: {
        Row: {
          created_at: string;
          id: string;
          issue_number: number | null;
          issue_url: string | null;
          last_error: string | null;
          organization_id: string;
          report_id: string;
          repository_id: string;
          status: Database['public']['Enums']['export_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          issue_number?: number | null;
          issue_url?: string | null;
          last_error?: string | null;
          organization_id: string;
          report_id: string;
          repository_id: string;
          status?: Database['public']['Enums']['export_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          issue_number?: number | null;
          issue_url?: string | null;
          last_error?: string | null;
          organization_id?: string;
          report_id?: string;
          repository_id?: string;
          status?: Database['public']['Enums']['export_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'github_exports_organization_id_report_id_fkey';
            columns: ['organization_id', 'report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['organization_id', 'id'];
          },
          {
            foreignKeyName: 'github_exports_organization_id_repository_id_fkey';
            columns: ['organization_id', 'repository_id'];
            isOneToOne: false;
            referencedRelation: 'github_repositories';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      github_installations: {
        Row: {
          account_login: string;
          created_at: string;
          id: string;
          installation_id: number;
          organization_id: string;
          suspended: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_login: string;
          created_at?: string;
          id?: string;
          installation_id: number;
          organization_id: string;
          suspended?: boolean;
          updated_at?: string;
        };
        Update: {
          account_login?: string;
          created_at?: string;
          id?: string;
          installation_id?: number;
          organization_id?: string;
          suspended?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'github_installations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      github_repositories: {
        Row: {
          created_at: string;
          enabled: boolean;
          full_name: string;
          github_id: number;
          id: string;
          installation_id: string;
          organization_id: string;
          selected: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          full_name: string;
          github_id: number;
          id?: string;
          installation_id: string;
          organization_id: string;
          selected?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          full_name?: string;
          github_id?: number;
          id?: string;
          installation_id?: string;
          organization_id?: string;
          selected?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'github_repositories_organization_id_installation_id_fkey';
            columns: ['organization_id', 'installation_id'];
            isOneToOne: false;
            referencedRelation: 'github_installations';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      ingestion_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      organization_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          organization_id: string;
          role: Database['public']['Enums']['member_role'];
          token_hash: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          organization_id: string;
          role: Database['public']['Enums']['member_role'];
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          organization_id?: string;
          role?: Database['public']['Enums']['member_role'];
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_invitations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_invitations_organization_id_invited_by_fkey';
            columns: ['organization_id', 'invited_by'];
            isOneToOne: false;
            referencedRelation: 'organization_members';
            referencedColumns: ['organization_id', 'user_id'];
          },
        ];
      };
      organization_members: {
        Row: {
          active: boolean;
          created_at: string;
          organization_id: string;
          role: Database['public']['Enums']['member_role'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          organization_id: string;
          role?: Database['public']['Enums']['member_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          organization_id?: string;
          role?: Database['public']['Enums']['member_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          plan: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          plan?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          plan?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      project_domains: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          origin: string;
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          origin: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          origin?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_domains_organization_id_project_id_fkey';
            columns: ['organization_id', 'project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          enabled: boolean;
          environment: string;
          id: string;
          name: string;
          organization_id: string;
          public_key: string;
          report_counter: number;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          environment?: string;
          id?: string;
          name: string;
          organization_id: string;
          public_key?: string;
          report_counter?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          environment?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          public_key?: string;
          report_counter?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      report_attachments: {
        Row: {
          created_at: string;
          id: string;
          mime_type: string;
          object_path: string;
          organization_id: string;
          report_id: string;
          size_bytes: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          mime_type: string;
          object_path: string;
          organization_id: string;
          report_id: string;
          size_bytes: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime_type?: string;
          object_path?: string;
          organization_id?: string;
          report_id?: string;
          size_bytes?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'report_attachments_organization_id_report_id_fkey';
            columns: ['organization_id', 'report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      report_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          organization_id: string;
          report_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          report_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_author_profile_fk';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_comments_organization_id_author_id_fkey';
            columns: ['organization_id', 'author_id'];
            isOneToOne: false;
            referencedRelation: 'organization_members';
            referencedColumns: ['organization_id', 'user_id'];
          },
          {
            foreignKeyName: 'report_comments_organization_id_report_id_fkey';
            columns: ['organization_id', 'report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      report_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: string;
          kind: string;
          organization_id: string;
          report_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          kind: string;
          organization_id: string;
          report_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          kind?: string;
          organization_id?: string;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_events_organization_id_report_id_fkey';
            columns: ['organization_id', 'report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      reports: {
        Row: {
          actual: string;
          assignee_id: string | null;
          context: NonNullable<Json>;
          created_at: string;
          description: string;
          expected: string;
          id: string;
          idempotency_key: string;
          organization_id: string;
          payload_hash: string;
          priority: Database['public']['Enums']['report_priority'];
          project_id: string;
          reference: string;
          reporter_email: string | null;
          sequence: number;
          status: Database['public']['Enums']['report_status'];
          steps: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          actual?: string;
          assignee_id?: string | null;
          context?: NonNullable<Json>;
          created_at?: string;
          description: string;
          expected?: string;
          id?: string;
          idempotency_key: string;
          organization_id: string;
          payload_hash: string;
          priority?: Database['public']['Enums']['report_priority'];
          project_id: string;
          reference: string;
          reporter_email?: string | null;
          sequence: number;
          status?: Database['public']['Enums']['report_status'];
          steps?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          actual?: string;
          assignee_id?: string | null;
          context?: NonNullable<Json>;
          created_at?: string;
          description?: string;
          expected?: string;
          id?: string;
          idempotency_key?: string;
          organization_id?: string;
          payload_hash?: string;
          priority?: Database['public']['Enums']['report_priority'];
          project_id?: string;
          reference?: string;
          reporter_email?: string | null;
          sequence?: number;
          status?: Database['public']['Enums']['report_status'];
          steps?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_assignee_profile_fk';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_organization_id_assignee_id_fkey';
            columns: ['organization_id', 'assignee_id'];
            isOneToOne: false;
            referencedRelation: 'organization_members';
            referencedColumns: ['organization_id', 'user_id'];
          },
          {
            foreignKeyName: 'reports_organization_id_project_id_fkey';
            columns: ['organization_id', 'project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
      usage_daily: {
        Row: {
          day: string;
          organization_id: string;
          reports: number;
        };
        ComputedFields: never;
        Insert: {
          day?: string;
          organization_id: string;
          reports?: number;
        };
        Update: {
          day?: string;
          organization_id?: string;
          reports?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_daily_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      widget_settings: {
        Row: {
          accent: string;
          app_version: string | null;
          created_at: string;
          label: string;
          organization_id: string;
          position: string;
          project_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accent?: string;
          app_version?: string | null;
          created_at?: string;
          label?: string;
          organization_id: string;
          position?: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          accent?: string;
          app_version?: string | null;
          created_at?: string;
          label?: string;
          organization_id?: string;
          position?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'widget_settings_organization_id_project_id_fkey';
            columns: ['organization_id', 'project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['organization_id', 'id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_hash: string }; Returns: string };
      add_comment: {
        Args: { p_body: string; p_org: string; p_report: string };
        Returns: undefined;
      };
      change_member: {
        Args: {
          p_org: string;
          p_role?: Database['public']['Enums']['member_role'];
          p_user: string;
        };
        Returns: undefined;
      };
      claim_export: {
        Args: { p_org: string; p_report: string; p_repository: string };
        Returns: Json;
      };
      consume_rate: { Args: { p_key: string; p_max: number; p_seconds: number }; Returns: boolean };
      create_workspace: { Args: { p_name: string }; Returns: string };
      invite_member: {
        Args: {
          p_email: string;
          p_hash: string;
          p_org: string;
          p_role: Database['public']['Enums']['member_role'];
        };
        Returns: undefined;
      };
      is_admin: { Args: { p_org: string }; Returns: boolean };
      rename_workspace: { Args: { p_name: string; p_org: string }; Returns: undefined };
      revoke_invitation: { Args: { p_invitation: string; p_org: string }; Returns: undefined };
      role_in: { Args: { p_org: string }; Returns: Database['public']['Enums']['member_role'] };
      save_project: {
        Args: {
          p_accent?: string;
          p_enabled?: boolean;
          p_environment: string;
          p_id?: string;
          p_label?: string;
          p_name: string;
          p_org: string;
          p_origin: string;
          p_position?: string;
          p_rotate?: boolean;
          p_slug: string;
          p_version?: string;
        };
        Returns: string;
      };
      select_repository: {
        Args: { p_org: string; p_repository: string; p_selected: boolean };
        Returns: undefined;
      };
      submit_report: {
        Args: {
          p_attachment?: Json;
          p_data: Json;
          p_hash: string;
          p_key: string;
          p_project: string;
        };
        Returns: Json;
      };
      update_report: {
        Args: {
          p_assignee?: string;
          p_org: string;
          p_priority: Database['public']['Enums']['report_priority'];
          p_report: string;
          p_status: Database['public']['Enums']['report_status'];
        };
        Returns: undefined;
      };
      workspace_metrics: { Args: { p_org: string }; Returns: Json };
    };
    Enums: {
      export_status: 'pending' | 'processing' | 'completed' | 'failed' | 'needs_reconciliation';
      member_role: 'owner' | 'admin' | 'member';
      report_priority: 'low' | 'medium' | 'high' | 'critical';
      report_status: 'new' | 'triaged' | 'in_progress' | 'resolved' | 'closed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      export_status: ['pending', 'processing', 'completed', 'failed', 'needs_reconciliation'],
      member_role: ['owner', 'admin', 'member'],
      report_priority: ['low', 'medium', 'high', 'critical'],
      report_status: ['new', 'triaged', 'in_progress', 'resolved', 'closed'],
    },
  },
} as const;
