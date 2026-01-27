// 统一消息类型（易扩展，新增类型只需加枚举）
export type MessageType = 'GET_PROVIDER' | 'CHAT' | 'PROVIDER_UPDATE' | 'REPLY' | 'ERROR';
export type Message = {
  type: MessageType;
  payload?: any; // 负载（按需扩展）
};

// 通信工具类（封装，解耦）
export class VscodeMsg {
  // 发送消息到插件
  static send(msg: Message) {
    if (window.vscode) {
      window.vscode.postMessage(msg);
    }
  }

  // 监听插件消息（统一处理）
  static onMessage(callback: (msg: Message) => void) {
    window.addEventListener('message', (e) => {
      callback(e.data as Message);
    });
  }
}

// 声明全局 vscode 对象（类型提示）
declare global {
  interface Window {
    vscode: { postMessage: (msg: Message) => void };
  }
}