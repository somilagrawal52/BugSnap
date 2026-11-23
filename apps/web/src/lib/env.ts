export const configured=()=>!!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function required(name:string) {const value=process.env[name];if(!value)throw new Error(`Missing server configuration: ${name}`);return value;}
export const appUrl=()=>new URL(process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000').origin;
export const githubConfigured=()=>!!(process.env.GITHUB_APP_ID&&process.env.GITHUB_APP_SLUG&&process.env.GITHUB_PRIVATE_KEY&&process.env.GITHUB_CLIENT_ID&&process.env.GITHUB_CLIENT_SECRET);
