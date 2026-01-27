import { WebviewMessage } from '../components/ChatPanel/types';

/**
 * 封装VS Code Webview通信方法，解耦业务逻辑与VS Code API
 * @param message 要发送的消息体
 */
export const sendWebviewMessage = (message: WebviewMessage) => {
  if (typeof vscode === 'undefined') {
    console.warn('VS Code API 未加载，仅在Webview环境中可用');
    return;
  }
  vscode.postMessage(message);
};

/**
 * 监听Webview消息
 * @param callback 消息处理回调
 * @returns 取消监听的函数
 */
export const listenWebviewMessage = (
  callback: (message: WebviewMessage) => void
) => {
  const handler = (event: MessageEvent) => {
    callback(event.data as WebviewMessage);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};