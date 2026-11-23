import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
if (existsSync('apps/web/.env.local')) loadEnvFile('apps/web/.env.local');
const required = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUBMISSION_SECRET',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error('Missing environment variables: ' + missing.join(', '));
  process.exit(1);
}
for (const name of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
  const url = new URL(process.env[name]);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Invalid URL protocol: ${name}`);
  if (url.origin !== process.env[name].replace(/\/$/, ''))
    throw new Error(`Use an origin without a path: ${name}`);
}
if (process.env.SUBMISSION_SECRET.length < 32)
  throw new Error('SUBMISSION_SECRET must be at least 32 characters.');
const github = [
  'GITHUB_APP_ID',
  'GITHUB_APP_SLUG',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY',
  'GITHUB_WEBHOOK_SECRET',
];
if (github.some((name) => process.env[name]) && !github.every((name) => process.env[name]))
  throw new Error('Set all GitHub App variables together or leave them all unset.');
if (!!process.env.TURNSTILE_SECRET_KEY !== !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  throw new Error('Set both Turnstile keys together.');
console.log(
  'Required environment configuration is present. GitHub: ' +
    (process.env.GITHUB_APP_ID ? 'configured' : 'disabled') +
    '. Turnstile: ' +
    (process.env.TURNSTILE_SECRET_KEY ? 'configured' : 'disabled') +
    '. Values were not printed.',
);
