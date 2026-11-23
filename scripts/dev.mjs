import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
if (existsSync('apps/web/.env.local')) loadEnvFile('apps/web/.env.local');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const port = Number(
  process.env.PORT ||
    new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').port ||
    3000,
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid development port');
const build = spawnSync(pnpm, ['--filter', '@bugsnap/widget', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (build.status !== 0) process.exit(build.status || 1);
const result = spawnSync(
  pnpm,
  [
    '--filter',
    '@bugsnap/web',
    'exec',
    'next',
    'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status || 0);
