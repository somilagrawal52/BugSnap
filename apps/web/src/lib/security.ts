import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {required,appUrl} from './env';
export const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
export function sign<T extends object>(data:T,seconds=900) {const body=Buffer.from(JSON.stringify({...data,exp:Math.floor(Date.now()/1000)+seconds})).toString('base64url');return body+'.'+createHmac('sha256',required('SUBMISSION_SECRET')).update(body).digest('base64url');}
export function verify<T>(token:string):T&{exp:number} {
 const [body,sig,...rest]=token.split('.'); if(!body||!sig||rest.length)throw new Error('Invalid token');
 const expected=createHmac('sha256',required('SUBMISSION_SECRET')).update(body).digest();const actual=Buffer.from(sig,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Invalid token');
 const value=JSON.parse(Buffer.from(body,'base64url').toString());if(typeof value.exp!=='number'||value.exp<Math.floor(Date.now()/1000))throw new Error('Expired token');return value;
}
export function sameOrigin(request:Request) {return request.headers.get('origin')===appUrl();}
export async function boundedBody(request:Request,limit:number) {
 if(Number(request.headers.get('content-length'))>limit)throw new Error('Payload too large');
 const reader=request.body?.getReader(); if(!reader)throw new Error('Empty payload');const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('Payload too large');}chunks.push(value);}
 return Buffer.concat(chunks);
}
export function rateKey(request:Request,scope:string){
 // Vercel overwrites x-vercel-forwarded-for. Other hosts must overwrite forwarded headers at the trusted edge.
 const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for'):process.env.TRUST_PROXY==='true'?request.headers.get('x-forwarded-for')?.split(',')[0]:'local';
 return createHmac('sha256',required('SUBMISSION_SECRET')).update(`${scope}:${ip||'unknown'}:${new Date().toISOString().slice(0,10)}`).digest('hex');
}
export function webhookValid(body:string,signature:string,secret:string){const expected='sha256='+createHmac('sha256',secret).update(body).digest('hex');const a=Buffer.from(expected),b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b);}
