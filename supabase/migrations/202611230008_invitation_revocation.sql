-- Allow workspace owners/admins to revoke pending invitations cleanly.
create function public.revoke_invitation(p_org uuid,p_invitation uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_inv organization_invitations; begin
 if not public.is_admin(p_org) then raise exception 'Administrator required'; end if;
 delete from organization_invitations where id=p_invitation and organization_id=p_org and accepted_at is null returning * into v_inv;
 if not found then raise exception 'Invitation unavailable'; end if;
 insert into audit_logs(organization_id,actor_id,action,details) values(p_org,auth.uid(),'invitation.revoked',jsonb_build_object('invitation',v_inv.id,'email',v_inv.email,'role',v_inv.role));
end $$;
revoke all on function public.revoke_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.revoke_invitation(uuid,uuid) to authenticated,service_role;
