'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,Inbox,FolderKanban,Users,Plug,Zap,Settings} from 'lucide-react';
const icons:Record<string,typeof Inbox>={overview:LayoutDashboard,reports:Inbox,projects:FolderKanban,team:Users,integrations:Plug,usage:Zap,settings:Settings};
export function NavLinks({links}:{links:{key:string;title:string;href:string}[]}) {const path=usePathname();return <nav className="app-nav">{links.map(l=>{const Icon=icons[l.key];return <Link key={l.key} className={`nav-link ${(l.key==='overview'?path===l.href:path.startsWith(l.href))?'active':''}`} href={l.href}><Icon size={18}/>{l.title}</Link>;})}</nav>;}
