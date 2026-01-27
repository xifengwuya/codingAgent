import { useState, useEffect, useCallback } from 'react';
import { ChatConfig, WebviewMessage } from '../components/ChatPanel/types';

// 声明 VS Code API（改为全局声明，更规范，避免重复定义）
declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      setState: (state: any) => void;
      getState: () => any;
    };
    vscode: ReturnType<typeof window.acquireVsCodeApi>;
  }
}

// 获取 VS Code API 实例（改为挂载到window，避免作用域问题）
const getVsCodeAPI = () => {
  if (typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function') {
    return window.acquireVsCodeApi();
  }
  // 开发环境下的模拟实现
  console.warn('VS Code API not available, using mock for development');
  return {
    postMessage: (message: any) => console.log('Mock postMessage:', message),
    setState: (newState: any) => console.log('Mock setState:', newState),
    getState: () => null
  };
};

// 初始化vscode并挂载到window（确保全局可访问）
if (typeof window !== 'undefined' && !window.vscode) {
  window.vscode = getVsCodeAPI();
}
const vscode = window.vscode;

// 独立的配置管理Hook，低耦合，可复用
export const useChatConfig = () => {
  const [config, setConfig] = useState<ChatConfig>({
    provider: 'deepseek', // 默认值
    proxyEnabled: false
  });

  // 监听扩展端的配置消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === 'config-data') {
        // 关键修改1：给provider加兜底，避免扩展端返回空值
        setConfig(prev => ({ 
          ...prev, 
          ...message.data,
          provider: message.data.provider || prev.provider // 扩展端返回空则用默认值
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    // 主动请求扩展端发送当前配置
    vscode.postMessage({ type: 'request-config' } as WebviewMessage);

    // 清理监听，避免内存泄漏
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { config };
};