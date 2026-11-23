-- All tenant data is private. Public ingestion is an explicitly service-only RPC.
create type public.member_role as enum ('owner','admin','member');
create type public.report_status as enum ('new','triaged','in_progress','resolved','closed');
create type public.report_priority as enum ('low','medium','high','critical');
create type public.export_status as enum ('pending','processing','completed','failed','needs_reconciliation');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', created_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 80),
 plan text not null default 'free' check(plan in ('free','starter','team')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, role public.member_role not null default 'member',
 created_at timestamptz not null default now(), primary key(organization_id,user_id)
);
create index member_user_idx on public.organization_members(user_id);
create table public.organization_invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null check(length(email)<255), role public.member_role not null check(role<>'owner'), token_hash text not null unique,
 invited_by uuid not null, expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz,
 created_at timestamptz not null default now(), foreign key(organization_id,invited_by) references public.organization_members(organization_id,user_id)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(length(name) between 2 and 80), slug text not null check(slug ~ '^[a-z0-9][a-z0-9-]{1,49}$'),
 environment text not null default 'production' check(environment in ('production','staging','development')),
 public_key text not null unique default 'bs_'||replace(gen_random_uuid()::text,'-',''), enabled boolean not null default true,
 report_counter bigint not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id), unique(organization_id,slug)
);
create table public.project_domains (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 origin text not null check(length(origin)<300), created_at timestamptz not null default now(),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade, unique(project_id,origin)
);
create table public.widget_settings (
 project_id uuid primary key, organization_id uuid not null, label text not null default 'Report a bug' check(length(label) between 1 and 40),
 accent text not null default '#6554e8' check(accent ~ '^#[0-9a-fA-F]{6}$'), position text not null default 'bottom-right' check(position in ('bottom-right','bottom-left')),
 app_version text check(length(app_version)<=80), foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 sequence bigint not null, reference text not null, idempotency_key uuid not null, payload_hash text not null,
 title text not null check(length(title) between 3 and 180), description text not null check(length(description) between 10 and 10000),
 steps text not null default '' check(length(steps)<=5000), expected text not null default '' check(length(expected)<=3000), actual text not null default '' check(length(actual)<=3000),
 reporter_email text check(length(reporter_email)<255), context jsonb not null default '{}',
 status public.report_status not null default 'new', priority public.report_priority not null default 'medium', assignee_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id), unique(project_id,reference), unique(project_id,sequence), unique(project_id,idempotency_key),
 foreign key(organization_id,project_id) references public.projects(organization_id,id),
 foreign key(organization_id,assignee_id) references public.organization_members(organization_id,user_id)
);
create index reports_org_created_idx on public.reports(organization_id,created_at desc);
create index reports_filter_idx on public.reports(organization_id,project_id,status,priority);
create index reports_search_idx on public.reports using gin(to_tsvector('english',reference||' '||title||' '||description));
create table public.report_attachments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, report_id uuid not null unique,
 object_path text not null unique, mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp')),
 size_bytes integer not null check(size_bytes between 1 and 5242880), created_at timestamptz not null default now(),
 foreign key(organization_id,report_id) references public.reports(organization_id,id) on delete cascade
);
create table public.report_comments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, report_id uuid not null, author_id uuid not null,
 body text not null check(length(body) between 1 and 5000), created_at timestamptz not null default now(),
 foreign key(organization_id,report_id) references public.reports(organization_id,id) on delete cascade,
 foreign key(organization_id,author_id) references public.organization_members(organization_id,user_id)
);
create table public.report_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, report_id uuid not null, actor_id uuid references public.profiles(id),
 kind text not null, details jsonb not null default '{}', created_at timestamptz not null default now(),
 foreign key(organization_id,report_id) references public.reports(organization_id,id) on delete cascade
);
create table public.github_installations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 installation_id bigint not null unique, account_login text not null, suspended boolean not null default false,
 created_at timestamptz not null default now(), unique(organization_id,id)
);
create table public.github_repositories (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, installation_id uuid not null,
 github_id bigint not null, full_name text not null, enabled boolean not null default true, selected boolean not null default false,
 foreign key(organization_id,installation_id) references public.github_installations(organization_id,id) on delete cascade,
 unique(installation_id,github_id), unique(organization_id,id)
);
create table public.github_exports (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, report_id uuid not null, repository_id uuid not null,
 status public.export_status not null default 'pending', issue_number bigint, issue_url text, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,report_id) references public.reports(organization_id,id),
 foreign key(organization_id,repository_id) references public.github_repositories(organization_id,id), unique(report_id,repository_id)
);
create table public.usage_daily (
 organization_id uuid not null references public.organizations(id) on delete cascade, day date not null default (now() at time zone 'utc')::date,
 reports integer not null default 0 check(reports>=0), primary key(organization_id,day)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_id uuid references public.profiles(id), action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.ingestion_limits (
 key text primary key, window_start timestamptz not null, count integer not null default 1
);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','')); return new; end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.role_in(p_org uuid) returns public.member_role language sql stable security definer set search_path=public as $$
 select role from organization_members where organization_id=p_org and user_id=auth.uid()
$$;
create function public.is_admin(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(public.role_in(p_org) in ('owner','admin'),false)
$$;

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from organization_members mine join organization_members other using(organization_id) where mine.user_id=auth.uid() and other.user_id=profiles.id));
alter table public.organizations enable row level security;
create policy org_read on public.organizations for select to authenticated using(public.role_in(id) is not null);
do $$ declare t text; begin
 foreach t in array array['organization_members','organization_invitations','projects','project_domains','widget_settings','reports','report_attachments','report_comments','report_events','github_installations','github_repositories','github_exports','usage_daily','audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using (public.role_in(organization_id) is not null)',t);
 end loop;
end $$;
-- Invitation hashes and audit records are admin-only even within the tenant.
drop policy tenant_read on public.organization_invitations;
create policy invitation_read on public.organization_invitations for select to authenticated using(public.is_admin(organization_id));
drop policy tenant_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using(public.is_admin(organization_id));
alter table public.ingestion_limits enable row level security;

create function public.create_workspace(p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if (select count(*) from organization_members where user_id=auth.uid() and role='owner')>=5 then raise exception 'Workspace limit reached'; end if;
 insert into organizations(name) values(trim(p_name)) returning id into v_org;
 insert into organization_members values(v_org,auth.uid(),'owner',now());
 return v_org;
end $$;

create function public.save_project(p_org uuid,p_name text,p_slug text,p_environment text,p_origin text,p_id uuid default null,p_enabled boolean default true,p_label text default 'Report a bug',p_accent text default '#6554e8',p_position text default 'bottom-right',p_version text default null,p_rotate boolean default false) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_plan text; v_limit integer; begin
 if not public.is_admin(p_org) then raise exception 'Administrator required'; end if;
 select plan into v_plan from organizations where id=p_org for update;
 if p_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' and not (p_environment='development' and p_origin ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$') then raise exception 'Use an HTTPS origin (localhost only in development)'; end if;
 if p_id is null then
 v_limit:=case v_plan when 'free' then 1 when 'starter' then 3 else 10 end;
 if (select count(*) from projects where organization_id=p_org)>=v_limit then raise exception 'Project limit reached'; end if;
 insert into projects(organization_id,name,slug,environment) values(p_org,p_name,p_slug,p_environment) returning id into v_id;
 else
 update projects set name=p_name,slug=p_slug,environment=p_environment,enabled=p_enabled,updated_at=now(),public_key=case when p_rotate then 'bs_'||replace(gen_random_uuid()::text,'-','') else public_key end where id=p_id and organization_id=p_org returning id into v_id;
 if v_id is null then raise exception 'Project unavailable'; end if;
 end if;
 delete from project_domains where project_id=v_id;
 insert into project_domains(organization_id,project_id,origin) values(p_org,v_id,p_origin);
 insert into widget_settings(project_id,organization_id,label,accent,position,app_version) values(v_id,p_org,p_label,p_accent,p_position,nullif(p_version,'')) on conflict(project_id) do update set label=excluded.label,accent=excluded.accent,position=excluded.position,app_version=excluded.app_version;
 insert into audit_logs(organization_id,actor_id,action,details) values(p_org,auth.uid(),'project.saved',jsonb_build_object('project_id',v_id));
 return v_id;
end $$;

create function public.update_report(p_org uuid,p_report uuid,p_status public.report_status,p_priority public.report_priority,p_assignee uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare v_old reports; begin
 if public.role_in(p_org) is null then raise exception 'Membership required'; end if;
 select * into v_old from reports where id=p_report and organization_id=p_org for update;
 if not found then raise exception 'Report unavailable'; end if;
 update reports set status=p_status,priority=p_priority,assignee_id=p_assignee,updated_at=now() where id=p_report;
 insert into report_events(organization_id,report_id,actor_id,kind,details) values(p_org,p_report,auth.uid(),'report.updated',jsonb_build_object('before',jsonb_build_object('status',v_old.status,'priority',v_old.priority,'assignee',v_old.assignee_id),'after',jsonb_build_object('status',p_status,'priority',p_priority,'assignee',p_assignee)));
end $$;
create function public.add_comment(p_org uuid,p_report uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$
begin
 if public.role_in(p_org) is null then raise exception 'Membership required'; end if;
 insert into report_comments(organization_id,report_id,author_id,body) values(p_org,p_report,auth.uid(),trim(p_body));
 insert into report_events(organization_id,report_id,actor_id,kind) values(p_org,p_report,auth.uid(),'comment.added');
end $$;
create function public.rename_workspace(p_org uuid,p_name text) returns void language plpgsql security definer set search_path=public as $$
begin if public.role_in(p_org) is distinct from 'owner' then raise exception 'Owner required'; end if; update organizations set name=p_name,updated_at=now() where id=p_org; end $$;
create function public.change_member(p_org uuid,p_user uuid,p_role public.member_role default null) returns void language plpgsql security definer set search_path=public as $$
declare v_target public.member_role; begin
 select role into v_target from organization_members where organization_id=p_org and user_id=p_user for update;
 if not public.is_admin(p_org) or v_target='owner' or p_role='owner' or (public.role_in(p_org)='admin' and (v_target<>'member' or p_role='admin')) then raise exception 'Role change forbidden'; end if;
 if p_role is null then
 update reports set assignee_id=null where organization_id=p_org and assignee_id=p_user;
 -- Retain authorship/membership history; removal is blocked while comments/invitations reference the member.
 delete from organization_members where organization_id=p_org and user_id=p_user;
 else update organization_members set role=p_role where organization_id=p_org and user_id=p_user; end if;
 insert into audit_logs(organization_id,actor_id,action,details) values(p_org,auth.uid(),'member.changed',jsonb_build_object('user',p_user,'role',p_role));
end $$;
create function public.invite_member(p_org uuid,p_email text,p_role public.member_role,p_hash text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin(p_org) or p_role='owner' or (p_role='admin' and public.role_in(p_org)<>'owner') then raise exception 'Invitation forbidden'; end if;
 insert into organization_invitations(organization_id,email,role,token_hash,invited_by) values(p_org,lower(trim(p_email)),p_role,p_hash,auth.uid());
end $$;
create function public.accept_invitation(p_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_inv organization_invitations; v_email text; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select email into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into v_inv from organization_invitations where token_hash=p_hash and expires_at>now() and accepted_at is null for update;
 if v_inv.id is null or lower(v_email) is distinct from v_inv.email then raise exception 'Invitation unavailable; verify the invited email'; end if;
 insert into organization_members(organization_id,user_id,role) values(v_inv.organization_id,auth.uid(),v_inv.role) on conflict do nothing;
 update organization_invitations set accepted_at=now() where id=v_inv.id;
 return v_inv.organization_id;
end $$;

-- Rate limit persists across server instances. Key is an HMAC, never a raw IP address.
create function public.consume_rate(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer; begin
 insert into ingestion_limits(key,window_start) values(p_key,now()) on conflict(key) do update set count=case when ingestion_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else ingestion_limits.count+1 end,window_start=case when ingestion_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else ingestion_limits.window_start end returning count into v_count;
 return v_count<=p_max;
end $$;

create function public.submit_report(p_project uuid,p_key uuid,p_hash text,p_data jsonb,p_attachment jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_project projects; v_org organizations; v_existing reports; v_report reports; v_used integer; v_limit integer; v_seq bigint; begin
 select * into v_project from projects where id=p_project;
 if not found or not v_project.enabled then raise exception 'Project unavailable'; end if;
 select * into v_org from organizations where id=v_project.organization_id for update;
 -- Organization lock serializes quota and idempotency checks across all projects.
 select * into v_existing from reports where project_id=p_project and idempotency_key=p_key;
 if found then
 if v_existing.payload_hash<>p_hash then raise exception 'Idempotency key reused with different content'; end if;
 return jsonb_build_object('id',v_existing.id,'reference',v_existing.reference,'duplicate',true); end if;
 select coalesce(sum(reports),0) into v_used from usage_daily where organization_id=v_org.id and day>=date_trunc('month',now() at time zone 'utc')::date;
 v_limit:=case v_org.plan when 'free' then 50 when 'starter' then 500 else 2000 end;
 if v_used>=v_limit then raise exception 'Monthly report limit reached'; end if;
 update projects set report_counter=report_counter+1 where id=p_project and enabled=true returning report_counter into v_seq;
 if v_seq is null then raise exception 'Project unavailable'; end if;
 insert into reports(organization_id,project_id,sequence,reference,idempotency_key,payload_hash,title,description,steps,expected,actual,reporter_email,context)
 values(v_org.id,p_project,v_seq,upper(left(v_project.slug,8))||'-'||v_seq,p_key,p_hash,p_data->>'title',p_data->>'description',coalesce(p_data->>'steps',''),coalesce(p_data->>'expected',''),coalesce(p_data->>'actual',''),nullif(p_data->>'email',''),coalesce(p_data->'context','{}')||jsonb_build_object('environment',v_project.environment)) returning * into v_report;
 if p_attachment is not null then
 if p_attachment->>'path' not like v_org.id::text||'/%' then raise exception 'Invalid attachment'; end if;
 insert into report_attachments(organization_id,report_id,object_path,mime_type,size_bytes) values(v_org.id,v_report.id,p_attachment->>'path',p_attachment->>'mime',(p_attachment->>'size')::integer);
 end if;
 insert into usage_daily(organization_id,day,reports) values(v_org.id,(now() at time zone 'utc')::date,1) on conflict(organization_id,day) do update set reports=usage_daily.reports+1;
 insert into report_events(organization_id,report_id,kind) values(v_org.id,v_report.id,'report.created');
 return jsonb_build_object('id',v_report.id,'reference',v_report.reference,'duplicate',false);
end $$;

create function public.select_repository(p_org uuid,p_repository uuid,p_selected boolean) returns void language plpgsql security definer set search_path=public as $$
begin if not public.is_admin(p_org) then raise exception 'Administrator required'; end if; update github_repositories set selected=p_selected where organization_id=p_org and id=p_repository and enabled; end $$;
create function public.claim_export(p_org uuid,p_report uuid,p_repository uuid) returns public.github_exports language plpgsql security definer set search_path=public as $$
declare v_export github_exports; begin
 if public.role_in(p_org) is null then raise exception 'Membership required'; end if;
 if not exists(select 1 from github_repositories r join github_installations i on i.id=r.installation_id where r.id=p_repository and r.organization_id=p_org and r.enabled and r.selected and not i.suspended) then raise exception 'Repository unavailable'; end if;
 insert into github_exports(organization_id,report_id,repository_id) values(p_org,p_report,p_repository) on conflict do nothing;
 select * into v_export from github_exports where report_id=p_report and repository_id=p_repository for update;
 if v_export.status='processing' and v_export.updated_at<now()-interval '2 minutes' then update github_exports set status='needs_reconciliation',updated_at=now() where id=v_export.id returning * into v_export;
 elsif v_export.status in ('pending','failed') then update github_exports set status='processing',updated_at=now() where id=v_export.id returning * into v_export;
 end if;
 return v_export;
end $$;

-- Explicit API grants: no direct client writes, and no anonymous tenant reads.
revoke all on all tables in schema public from anon,authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant select on public.profiles,public.organizations,public.organization_members,public.organization_invitations,public.projects,public.project_domains,public.widget_settings,public.reports,public.report_attachments,public.report_comments,public.report_events,public.github_installations,public.github_repositories,public.github_exports,public.usage_daily,public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.role_in(uuid),public.is_admin(uuid) to authenticated;
grant execute on function public.create_workspace(text),public.save_project(uuid,text,text,text,text,uuid,boolean,text,text,text,text,boolean),public.update_report(uuid,uuid,public.report_status,public.report_priority,uuid),public.add_comment(uuid,uuid,text),public.rename_workspace(uuid,text),public.change_member(uuid,uuid,public.member_role),public.invite_member(uuid,text,public.member_role,text),public.accept_invitation(text),public.select_repository(uuid,uuid,boolean),public.claim_export(uuid,uuid,uuid) to authenticated;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public revoke execute on functions from public;
