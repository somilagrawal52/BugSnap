import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
if (existsSync('apps/web/.env.local')) loadEnvFile('apps/web/.env.local');
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3210',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'pnpm --filter @bugsnap/web exec next start -p 3210 --hostname 127.0.0.1',
          url: 'http://127.0.0.1:3210',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
        ...(process.env.E2E_BACKEND === '1'
          ? [
              {
                command: 'node tests/e2e/host.mjs',
                url: 'http://127.0.0.1:3211',
                reuseExistingServer: !process.env.CI,
                timeout: 20000,
              },
            ]
          : []),
      ],
});
