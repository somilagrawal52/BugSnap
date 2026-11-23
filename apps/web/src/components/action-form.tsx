'use client';
import {useActionState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@bugsnap/ui';
import type {ActionState} from '@/app/actions';
export function ActionForm({action,children,submit='Save changes',className='form-stack'}:{action:(state:ActionState,data:FormData)=>Promise<ActionState>;children:React.ReactNode;submit?:string;className?:string}) {
 const [state,formAction,pending]=useActionState(action,{});const router=useRouter();
 useEffect(()=>{if(state.redirect){router.push(state.redirect);router.refresh();}},[state,router]);
 return <form action={formAction} className={className}>{children}{state.error&&<p className="notice error" role="alert">{state.error}</p>}{state.success&&<p className="notice success" role="status">{state.success}</p>}{state.link&&<input aria-label="Invitation link" className="input" value={state.link} readOnly onFocus={e=>e.target.select()}/>}<Button disabled={pending} type="submit">{pending?'Saving…':submit}</Button></form>;
}
