import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@bugsnap/shared': resolve(root, 'packages/shared/src/index.ts'),
      '@': resolve(root, 'apps/web/src'),
    },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000, hookTimeout: 60000 },
});
