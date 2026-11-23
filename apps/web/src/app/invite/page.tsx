import Link from 'next/link';
import {ActionForm} from '@/components/action-form';
import {acceptInvitation} from '@/app/actions';
export default async function Invite({searchParams}:{searchParams:Promise<{token?:string}>}) {const {token}=await searchParams;return <main className="auth-page"><div className="auth-card"><h1>Join your team.</h1><p>Sign in with the verified email address this invitation was created for, then accept.</p><p><Link href="/login">Sign in</Link> or <Link href="/signup">create an account</Link></p><ActionForm action={acceptInvitation} submit="Accept invitation"><input type="hidden" name="token" value={token||''}/></ActionForm></div></main>;}
