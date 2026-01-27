// webview-ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.join(__dirname, '../out/webview/react'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: 'chunk.js',
        assetFileNames: 'asset.[ext]'
      },
      // 排除 VS Code API
      external: ['vscode']
    }
  },
  define: {
    // 全局常量，避免打包时报错
    'process.env': {},
    'window.acquireVsCodeApi': 'undefined'
  }
});