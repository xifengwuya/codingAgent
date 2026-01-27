// 全局声明vscode对象，整个Webview项目生效，避免重复声明
declare global {
  const vscode: {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
  };
}

// 必须导出空对象，让TS识别为模块
export {};