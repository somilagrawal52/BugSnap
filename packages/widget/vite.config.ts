import { defineConfig } from 'vite';
export default defineConfig({build:{lib:{entry:'src/index.ts',name:'BugSnapLoader',formats:['iife'],fileName:()=> 'widget.js'},outDir:'../../apps/web/public',emptyOutDir:false,minify:true}});
