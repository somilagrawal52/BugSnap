'use client';
import {Button} from '@bugsnap/ui';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state"><h2>We couldn’t load this workspace.</h2><p>Check your connection and that the database migrations have been applied.</p><Button onClick={reset}>Try again</Button></div>;}
