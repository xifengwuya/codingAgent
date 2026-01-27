import { useState, useCallback } from 'react';
import { Message, WebviewMessage } from '../components/ChatPanel/types';

// 全局声明VS Code API（更规范，避免重复定义）
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

// 初始化VS Code API（确保只执行一次）
if (typeof window !== 'undefined' && !window.vscode) {
  try {
    window.vscode = window.acquireVsCodeApi();
  } catch (err) {
    // 开发环境模拟
    window.vscode = {
      postMessage: (msg: any) => console.log('Mock postMessage:', msg),
      setState: () => {},
      getState: () => null
    };
  }
}

// 独立的对话列表Hook，职责单一，易扩展
export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  // 添加消息（通用方法，易扩展）
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // 发送用户消息（封装业务逻辑）
  const sendUserMessage = useCallback((content: string, provider: string) => {
    const trimmedContent = content.trim(); // 显式trim，更清晰
    if (!trimmedContent) return;

    // 1. 添加用户消息到列表
    const userMessage: Message = {
      id: Date.now().toString(),
      content: trimmedContent,
      role: 'user',
      timestamp: Date.now()
    };
    addMessage(userMessage);

    // 2. 向扩展端发送消息请求（使用window.vscode，避免作用域问题）
    window.vscode.postMessage({
      type: 'send-message',
      content: trimmedContent,
      provider
    } as WebviewMessage);

    // 3. 模拟加载中
    addMessage({
      id: (Date.now() + 1).toString(),
      content: '正在思考...',
      role: 'assistant',
      timestamp: Date.now()
    });
  }, [addMessage]);

  return { messages, sendUserMessage };
};