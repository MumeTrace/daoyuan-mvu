import { defineConfig, transformWithEsbuild, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import { createMvuMockPlugin } from './vite.mock-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildTarget = process.env.BUILD_TARGET || 'dev';

// 注入 Shujuku 适配器 (仅在 BUILD_TARGET=shujuku 时生效)
const shujukuPlugin = (): Plugin => {
  return {
    name: 'shujuku-plugin',
    async transformIndexHtml(html) {
      if (process.env.BUILD_TARGET === 'shujuku') {
        const adapterPath = path.resolve(__dirname, 'src/shujuku-adapter.ts');
        const adapterSource = fs.readFileSync(adapterPath, 'utf8');
        const adapterCode = await transformWithEsbuild(adapterSource, adapterPath, {
          loader: 'ts',
          target: 'es2022',
          format: 'iife',
          minify: false,
        });
        return [
          {
            tag: 'script',
            children: adapterCode.code,
            injectTo: 'head-prepend'
          }
        ];
      }
      return html;
    }
  }
};

const buildTargetPlugin = (): Plugin => ({
  name: 'daoyuan-build-target',
  configResolved(config) {
    console.log(`[道渊构建] target=${buildTarget} command=${config.command}`);
  },
});

export default defineConfig({
  root: 'src',
  plugins: [
    vue(),
    viteSingleFile(),
    buildTargetPlugin(),
    createMvuMockPlugin(path.resolve(__dirname, 'src/adapters/mock.ts')),
    shujukuPlugin()
  ],
  build: {
    minify: false,
    outDir: '../dist',
    emptyOutDir: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
