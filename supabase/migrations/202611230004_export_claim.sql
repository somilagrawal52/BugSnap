drop function public.claim_export(uuid,uuid,uuid);
create function public.claim_export(p_org uuid,p_report uuid,p_repository uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_export github_exports; v_claimed boolean:=false; begin
 if public.role_in(p_org) is null then raise exception 'Membership required'; end if;
 if not exists(select 1 from github_repositories r join github_installations i on i.id=r.installation_id where r.id=p_repository and r.organization_id=p_org and r.enabled and r.selected and not i.suspended) then raise exception 'Repository unavailable'; end if;
 insert into github_exports(organization_id,report_id,repository_id) values(p_org,p_report,p_repository) on conflict do nothing;
 select * into v_export from github_exports where report_id=p_report and repository_id=p_repository for update;
 if v_export.status='processing' and v_export.updated_at<now()-interval '2 minutes' then update github_exports set status='needs_reconciliation',updated_at=now() where id=v_export.id returning * into v_export;
 elsif v_export.status in ('pending','failed') then update github_exports set status='processing',updated_at=now() where id=v_export.id returning * into v_export; v_claimed:=true;
 end if;
 return jsonb_build_object('export',to_jsonb(v_export),'claimed',v_claimed);
end $$;
revoke all on function public.claim_export(uuid,uuid,uuid) from public,anon;
grant execute on function public.claim_export(uuid,uuid,uuid) to authenticated,service_role;
