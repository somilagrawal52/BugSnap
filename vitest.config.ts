import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  resolve: { alias: { '@bugsnap/shared': resolve(__dirname, 'packages/shared/src/index.ts') } },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000, hookTimeout: 60000 },
});
