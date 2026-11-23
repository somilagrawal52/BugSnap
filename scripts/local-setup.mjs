import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const target = 'apps/web/.env.local';
if (existsSync(target)) throw new Error(`${target} already exists. Refusing to overwrite it.`);
const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['dlx', 'supabase', 'status', '--output', 'json'],
  { encoding: 'utf8', shell: process.platform === 'win32' },
);
if (result.status !== 0)
  throw new Error('Start local Supabase with pnpm dlx supabase start first.');
const status = JSON.parse(result.stdout);
const origin = process.env.BUGSNAP_LOCAL_URL || 'http://localhost:3000';
if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY)
  throw new Error(
    'Local Supabase did not return the required credentials. No environment file was created.',
  );
writeFileSync(
  target,
  [
    `NEXT_PUBLIC_APP_URL=${origin}`,
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    `SUBMISSION_SECRET=${randomBytes(32).toString('hex')}`,
    `SEED_EMAIL=demo@example.test`,
    `SEED_PASSWORD=${randomBytes(24).toString('base64url')}`,
    'SEED_ALLOW_REMOTE=false',
    '',
  ].join('\n'),
  { flag: 'wx', mode: 0o600 },
);
console.log(
  `Created ${target} using real local Supabase credentials. Secrets were not printed. Run pnpm seed, then pnpm dev.`,
);
