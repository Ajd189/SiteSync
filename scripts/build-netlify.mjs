import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'vite';
import { addVisualLayer } from './visual-layer.mjs';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await addVisualLayer('dist/index.html');
await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: 'src/inbox.js',
      formats: ['es'],
      fileName: () => 'inbox.js'
    },
    minify: 'esbuild',
    sourcemap: false
  }
});
console.log('Built SiteSync static assets for Netlify.');
