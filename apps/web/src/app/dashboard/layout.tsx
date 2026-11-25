import Link from 'next/link';
import {
  LayoutDashboard,
  Inbox,
  FolderKanban,
  Users,
  Plug,
  Zap,
  Settings,
  BookOpen,
  LogOut,
  Plus,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { workspace } from '@/lib/workspace';
import { logout } from '@/app/actions';
import { NavLinks } from '@/components/nav-links';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
const icons = {
  overview: LayoutDashboard,
  reports: Inbox,
  projects: FolderKanban,
  team: Users,
  integrations: Plug,
  usage: Zap,
  settings: Settings,
};
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { org, user, role, memberships } = await workspace();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand href="/dashboard" />
        <WorkspaceSwitcher
          currentOrgId={org.id}
          currentOrgName={org.name}
          memberships={memberships as any}
        />
        <p className="nav-section">WORKSPACE</p>
        <NavLinks
          links={Object.keys(icons).map((key) => ({
            key,
            title: key[0].toUpperCase() + key.slice(1),
            href: key === 'overview' ? '/dashboard' : `/dashboard/${key}`,
          }))}
        />
        <div className="sidebar-bottom">
          <div className="plan-card">
            <span className="plan-heading">
              <Zap size={15} />
              {org.plan[0].toUpperCase() + org.plan.slice(1)} plan
            </span>
            <p>A clearer path from bug to fix.</p>
            <Link href="/dashboard/usage">View usage & limits</Link>
          </div>
          <Link className="nav-link" href="/docs">
            <BookOpen size={17} />
            Documentation
          </Link>
          <div className="profile">
            <span className="avatar">{user.email?.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{user.user_metadata.display_name || user.email?.split('@')[0]}</strong>
              <small>{role}</small>
            </span>
            <form action={logout}>
              <button aria-label="Sign out" className="icon-button">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <span>
            <span className="muted">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            {org.name}
          </span>
          <span className="topbar-right">
            <span className="private-label">Private workspace</span>
            <Link className="button button-outline button-sm" href="/dashboard/projects/new">
              <Plus size={15} />
              New project
            </Link>
            <form action={logout} className="mobile-logout">
              <button className="icon-button" aria-label="Sign out">
                <LogOut size={17} />
              </button>
            </form>
          </span>
        </header>
        <main className="dashboard-content">{children}</main>
        <footer className="app-footer">
          Less back-and-forth. More building.<span>BugSnap Beta</span>
        </footer>
      </div>
    </div>
  );
}
