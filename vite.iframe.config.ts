import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMvuMockPlugin } from './vite.mock-plugin';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src',
  plugins: [
    vue(),
    viteSingleFile(),
    createMvuMockPlugin(path.resolve(projectRoot, 'src/adapters/mock.ts'))
  ],
  server: {
    open: '/iframe-test.html'
  },
  build: {
    minify: false,
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        iframe: 'src/iframe-test.html'
      },
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
