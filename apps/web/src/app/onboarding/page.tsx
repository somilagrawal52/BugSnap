import {redirect} from 'next/navigation';
import {Brand} from '@/components/brand';
import {ActionForm} from '@/components/action-form';
import {onboard} from '@/app/actions';
import {sessionClient} from '@/lib/supabase/server';
import {configured} from '@/lib/env';
export default async function Onboarding(){if(!configured())redirect('/setup');const db=await sessionClient();if(!(await db.auth.getUser()).data.user)redirect('/login');return <main className="auth-page"><Brand/><div className="auth-card"><p className="eyebrow">LET’S GET YOU SET UP</p><h1>A home for your team’s next fix.</h1><p className="muted">Create your private workspace. You’ll add your first project next.</p><ActionForm action={onboard} submit="Create workspace"><label>Workspace name<input className="input" name="workspace" placeholder="e.g. Acme Labs" required minLength={2} maxLength={80}/></label></ActionForm></div></main>;}
