-- Revoke access without destroying historical comment/event authorship.
alter table public.organization_members add column active boolean not null default true;
create or replace function public.role_in(p_org uuid) returns public.member_role language sql stable security definer set search_path=public as $$
 select role from organization_members where organization_id=p_org and user_id=auth.uid() and active
$$;
create or replace function public.change_member(p_org uuid,p_user uuid,p_role public.member_role default null) returns void language plpgsql security definer set search_path=public as $$
declare v_target public.member_role; begin
 select role into v_target from organization_members where organization_id=p_org and user_id=p_user and active for update;
 if v_target is null or not public.is_admin(p_org) or v_target='owner' or p_role='owner' or (public.role_in(p_org)='admin' and (v_target<>'member' or p_role='admin')) then raise exception 'Role change forbidden'; end if;
 if p_role is null then
 update reports set assignee_id=null where organization_id=p_org and assignee_id=p_user;
 update organization_members set active=false where organization_id=p_org and user_id=p_user;
 else update organization_members set role=p_role where organization_id=p_org and user_id=p_user; end if;
 insert into audit_logs(organization_id,actor_id,action,details) values(p_org,auth.uid(),'member.changed',jsonb_build_object('user',p_user,'role',p_role));
end $$;
create or replace function public.accept_invitation(p_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_inv organization_invitations; v_email text; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select email into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into v_inv from organization_invitations where token_hash=p_hash and expires_at>now() and accepted_at is null for update;
 if v_inv.id is null or lower(v_email) is distinct from v_inv.email then raise exception 'Invitation unavailable; verify the invited email'; end if;
 insert into organization_members(organization_id,user_id,role) values(v_inv.organization_id,auth.uid(),v_inv.role)
 on conflict(organization_id,user_id) do update set active=true,role=case when organization_members.active then organization_members.role else excluded.role end;
 update organization_invitations set accepted_at=now() where id=v_inv.id;
 return v_inv.organization_id;
end $$;
create function public.validate_active_assignee() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.assignee_id is not null and not exists(select 1 from organization_members where organization_id=new.organization_id and user_id=new.assignee_id and active) then raise exception 'Assignee must be an active workspace member'; end if;
 return new;
end $$;
create trigger active_report_assignee before insert or update of assignee_id,organization_id on public.reports for each row execute function public.validate_active_assignee();
revoke all on function public.validate_active_assignee() from public,anon,authenticated;
