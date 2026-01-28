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
  isDone?: boolean;    // 可选（流式结束标记）
}

export type MessageType = 
  | 'request-config' 
  | 'send-message' 
  | 'clear-messages'
  | 'config-data' 
  | 'ai-service-error'
  | 'message-response'
  | 'messages-cleared'
  | 'message-stream' // 新增流式消息类型
  | 'panel-resize';

export interface WebviewMessage {
  type: MessageType;
  data?: any;
}

// 扩展流式消息数据类型（可选，增强类型安全）
export interface StreamMessageData extends Message {
  isDone: boolean;
}  
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