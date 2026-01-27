// webview-ui/src/utils/vscodeApi.ts
import React from 'react';
import { InitConfig, MessageType } from '../globalTypes';

/**
 * 封装VS Code API（适配全局 window.vscode）
 */
export const createVscodeApi = () => {
  // 🌟 核心修复：使用扩展端注入的全局 vscode 对象
  const vscode = window.vscode;
  if (!vscode) {
    throw new Error('VS Code API 未初始化，请在VS Code中运行');
  }

  // 合并配置（扩展端已注入 window.initConfig）
  const initConfig: InitConfig = {
    provider: 'deepseek',
    proxyEnabled: false,
    ...window.initConfig
  };

  // 发送消息（直接使用原生 API）
  const postVscodeMessage = (type: MessageType, data: Record<string, any> = {}) => {
    vscode.postMessage({ type, ...data });
  };

  return {
    initConfig,
    postVscodeMessage,
    vscode
  };
};

// 保留原有 useVscodeMessageListener Hook
export const useVscodeMessageListener = (
  callback: (message: { type: MessageType; data: any }) => void
) => {
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        callback(event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [callback]);
};

export {};