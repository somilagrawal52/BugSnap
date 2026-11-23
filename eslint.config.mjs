import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default [...next, ...ts, {ignores:['**/.next/**','**/dist/**','**/node_modules/**','apps/web/public/widget.js','**/next-env.d.ts']}, {rules:{'@typescript-eslint/no-explicit-any':'off','react-hooks/set-state-in-effect':'off','react-hooks/refs':'off','@next/next/no-img-element':'off'}}];
