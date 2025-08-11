// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',                 // Project root
  publicDir: 'public',       // Static assets like index.html
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
