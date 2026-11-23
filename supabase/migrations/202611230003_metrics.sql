create function public.workspace_metrics(p_org uuid) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare v_result jsonb; begin
 if public.role_in(p_org) is null then raise exception 'Membership required'; end if;
 select jsonb_build_object(
 'total',count(*),'new',count(*) filter(where status='new'),'in_progress',count(*) filter(where status='in_progress'),
 'resolved',count(*) filter(where status='resolved'),'week',count(*) filter(where created_at>=date_trunc('week',now())),
 'priorities',(select coalesce(jsonb_agg(s),'[]') from (select priority as name,count(*) as value from reports where organization_id=p_org group by priority) s),
 'projects',(select coalesce(jsonb_agg(s),'[]') from (select p.name,count(r.id) as value from projects p left join reports r on r.project_id=p.id where p.organization_id=p_org group by p.id,p.name) s),
 'trend',(select coalesce(jsonb_agg(s order by s.day),'[]') from (select d::date as day,count(r.id) as reports from generate_series((now() at time zone 'utc')::date-13,(now() at time zone 'utc')::date,interval '1 day') d left join reports r on (r.created_at at time zone 'utc')::date=d::date and r.organization_id=p_org group by d) s)
 ) into v_result from reports where organization_id=p_org;
 return v_result;
end $$;
revoke all on function public.workspace_metrics(uuid) from public,anon;
grant execute on function public.workspace_metrics(uuid) to authenticated,service_role;
