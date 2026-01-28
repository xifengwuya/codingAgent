import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 极简配置：仅保留Webview必需项，无任何Rollup冲突配置
export default defineConfig({
  plugins: [react()],
  // 基础路径：适配Webview本地资源相对路径加载
  base: './',
  build: {
    // 输出目录：严格匹配扩展的webview资源目录
    outDir: path.resolve(__dirname, '../out/webview/react'),
    // 核心1：禁用CSS提取，强制内联到JS，彻底消除bundle.css 404
    cssCodeSplit: false,
    // 核心2：只生成单个JS文件，无代码分割，避免Rollup配置冲突
    rollupOptions: {
      output: {
        // 固定输出为单个bundle.js，无vendor.js，简化Webview加载
        entryFileNames: 'bundle.js',
        manualChunks: () => 'bundle.js' // 强制所有代码打包到一个文件
      }
    },
    // 开发阶段关闭压缩，保留日志，方便调试（生产可开启）
    minify: false,
    // 适配VS Code内置Electron浏览器的ES语法
    target: 'es2020'
  }
});