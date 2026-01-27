// 对话消息类型（独立抽离，易扩展）
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system'; // 预留system角色，易扩展
  timestamp: number;
}

// 配置信息类型
export interface ChatConfig {
  provider: string;        // AI服务商（deepseek/aliyun等）
  proxyEnabled: boolean;   // 代理是否启用
  [key: string]: any;      // 预留扩展字段
}

// Webview通信消息类型
export interface WebviewMessage {
  type: 'request-config' | 'send-message' | 'config-data' | 'message-response';
  data?: any;
  content?: string;
  provider?: string;
}