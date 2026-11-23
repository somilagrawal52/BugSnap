import { workspace, assertResult } from '@/lib/workspace';
import { PageHeading } from '@/components/page-heading';
import { ActionForm } from '@/components/action-form';
import { inviteMember, changeMember } from '@/app/actions';
import { Badge } from '@bugsnap/ui';
export default async function Team() {
  const { db, org, role } = await workspace();
  const result = await db
    .from('organization_members')
    .select('*,profiles(display_name)')
    .eq('organization_id', org.id)
    .order('created_at');
  assertResult(result);
  const invitations =
    role !== 'member'
      ? await db
          .from('organization_invitations')
          .select('id,email,role,expires_at,accepted_at')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false })
      : null;
  return (
    <>
      <PageHeading
        title="Better fixes are a team effort."
        description="Manage the people who can see and work on your reports."
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Workspace members <span className="count-pill">{result.data?.length}</span>
          </h2>
        </div>
        {result.data?.map((m: any) => (
          <div className="team-row" key={m.user_id}>
            <span className="avatar">{(m.profiles.display_name || 'T').slice(0, 1)}</span>
            <div>
              <strong>{m.profiles.display_name || 'Teammate'}</strong>
              <small className="muted">{m.user_id.slice(0, 8)}</small>
            </div>
            <Badge>{m.role}</Badge>
            {role !== 'member' &&
              m.role !== 'owner' &&
              (role === 'owner' || m.role === 'member') && (
                <ActionForm
                  className="inline-form"
                  action={changeMember.bind(null, m.user_id)}
                  submit="Update"
                >
                  <select name="role" defaultValue={m.role} aria-label="Member role">
                    <option value="member">Member</option>
                    {role === 'owner' && <option value="admin">Admin</option>}
                    <option value="remove">Remove</option>
                  </select>
                </ActionForm>
              )}
          </div>
        ))}
      </section>
      {role !== 'member' && (
        <section className="panel settings-panel">
          <h2>Invite a teammate</h2>
          <p className="muted">
            Create an email-bound link, then share it yourself. BugSnap does not send invitation
            emails. Removing a member with historical authorship is restricted to preserve the audit
            trail.
          </p>
          <ActionForm action={inviteMember} submit="Create invitation">
            <div className="form-grid">
              <label>
                Email
                <input className="input" type="email" name="email" required />
              </label>
              <label>
                Role
                <select name="role">
                  <option value="member">Member</option>
                  {role === 'owner' && <option value="admin">Admin</option>}
                </select>
              </label>
            </div>
          </ActionForm>
          {!!invitations?.data?.length && (
            <>
              <h3>Invitations</h3>
              {invitations.data.map((i) => (
                <div className="invitation-row" key={i.id}>
                  <span>{i.email}</span>
                  <Badge>
                    {i.accepted_at
                      ? 'Accepted'
                      : new Date(i.expires_at) < new Date()
                        ? 'Expired'
                        : 'Pending'}
                  </Badge>
                  <small>{i.role}</small>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </>
  );
}
