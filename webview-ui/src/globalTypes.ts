// webview-ui/src/globalTypes.ts
// 纯类型文件（后缀.ts，消除编辑器误提示）
export interface InitConfig {
  provider: string;
  proxyEnabled?: boolean;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export type MessageType = 
  | 'request-config' 
  | 'send-message' 
  | 'clear-messages'
  | 'config-data' 
  | 'message-response'
  | 'messages-cleared';

// 扩展 Window 全局接口（仅此处声明）
declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
    initConfig?: InitConfig;
  }
}

// 确保文件被视为模块
export {};