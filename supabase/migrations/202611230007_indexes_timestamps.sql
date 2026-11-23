create index invitations_org_idx on public.organization_invitations(organization_id,created_at desc);
create index comments_report_idx on public.report_comments(organization_id,report_id,created_at);
create index events_report_idx on public.report_events(organization_id,report_id,created_at desc);
create index exports_org_idx on public.github_exports(organization_id,updated_at desc);
create index audit_org_idx on public.audit_logs(organization_id,created_at desc);
create index ingestion_expiry_idx on public.ingestion_limits(window_start);
alter table public.widget_settings add column created_at timestamptz not null default now();
alter table public.widget_settings add column updated_at timestamptz not null default now();
alter table public.organization_members add column updated_at timestamptz not null default now();
alter table public.organization_invitations add column updated_at timestamptz not null default now();
alter table public.github_installations add column updated_at timestamptz not null default now();
alter table public.github_repositories add column created_at timestamptz not null default now();
alter table public.github_repositories add column updated_at timestamptz not null default now();
create function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$begin new.updated_at=now(); return new; end $$;
do $$declare t text; begin
 foreach t in array array['organizations','organization_members','organization_invitations','projects','widget_settings','reports','github_installations','github_repositories','github_exports'] loop
 execute format('create trigger set_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;
end $$;
revoke all on function public.touch_updated_at() from public,anon,authenticated;
