import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
const config = [
  ...next,
  ...ts,
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/node_modules/**',
      'apps/web/public/widget.js',
      '**/next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      '.supabase/**',
    ],
  },
  {
    settings: { next: { rootDir: ['apps/web/', 'examples/nextjs-demo/'] } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/incompatible-library': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
export default config;
