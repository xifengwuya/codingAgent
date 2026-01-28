import React from 'react';
import { InitConfig, MessageType } from '../globalTypes';

/**
 * 封装VS Code API（适配全局 window.vscode）
 * @returns { initConfig: 初始化配置, postVscodeMessage: 发送消息到扩展端, vscode: VS Code 原生 API }
 */
export const createVscodeApi = (): {
  initConfig: InitConfig;
  postVscodeMessage: (type: MessageType, data?: Record<string, any>) => void;
  vscode: any;
} => {
  const vscode = window.vscode;
  if (!vscode) {
    throw new Error('VS Code API 未初始化，请在VS Code中运行');
  }

  const initConfig: InitConfig = {
    provider: 'deepseek',
    proxyEnabled: false,
    ...window.initConfig
  };

  const postVscodeMessage = (type: MessageType, data: Record<string, any> = {}) => {
    vscode.postMessage({ type, ...data });
  };

  return {
    initConfig,
    postVscodeMessage,
    vscode
  };
};

/**
 * 监听扩展端发送的消息
 * @param callback 消息处理回调函数
 */
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