// webview-ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 配置路径别名（可选，简化导入路径）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 输出目录：对应扩展端加载的路径
    outDir: path.join(__dirname, '../out/webview/react'),
    emptyOutDir: true, // 打包前清空输出目录
    rollupOptions: {
      output: {
        // 简化输出文件名，避免哈希（便于扩展端引用）
        entryFileNames: 'public.js', // 修正：原配置少了 .js 后缀
        chunkFileNames: 'chunk.js',
        assetFileNames: 'asset.[ext]'
      },
      // 排除 VS Code API，避免打包进去
      external: ['vscode']
    },
    // 生产环境移除 console（可选）
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  define: {
    // 全局常量，避免 VS Code API 打包报错
    'process.env': {},
    // 告诉 Vite 不处理 acquireVsCodeApi（由扩展端注入）
    'window.acquireVsCodeApi': () => undefined
  }
});