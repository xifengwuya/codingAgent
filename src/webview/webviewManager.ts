import * as vscode from 'vscode';
import { ConfigManager } from '../services/configManager';
import { MultiAiService } from '../services/multiAi.service';
import * as path from 'path';
export class WebviewManager {
  private static instance: WebviewManager;
  private panel?: vscode.WebviewPanel;

  private constructor() {}

  public static getInstance(): WebviewManager {
    if (!WebviewManager.instance) {
      WebviewManager.instance = new WebviewManager();
    }
    return WebviewManager.instance;
  }

  // 显示Webview面板
  public showPanel(context: vscode.ExtensionContext) { // 移除async（无需异步）
    if (this.panel) {
      this.panel.dispose();
    }
    this.hasSentConfig = false; // 重置配置发送标记

    // 1. 创建面板（核心修复：localResourceRoots 指向文件而非目录）
    // WebviewManager.ts - showPanel 方法
    this.panel = vscode.window.createWebviewPanel(
      'coding-agent-chat',
      'AI 编程助手',
      { viewColumn: vscode.ViewColumn.Three, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        // 🌟 核心修复：指向扩展根目录，而非 webview 子目录
        localResourceRoots: [
  vscode.Uri.file(path.join(context.extensionPath, 'out/webview/react'))
],
        // 禁用自动样式加载（可选）
        enableFindWidget: false,
        enableCommandUris: false
      }
    );

    // 2. 面板销毁回调
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, context.subscriptions);

    // 3. 注册消息监听
    this.registerWebviewMessageListener(context);

    // 4. 生成HTML（同步调用，无需await）
    this.panel.webview.html = this.getWebviewHtml(context);

    // 5. 强制显示面板
    this.panel.reveal(vscode.ViewColumn.Three);
  }

  // 注册消息监听
  // WebviewManager.ts - 注册消息监听方法（完整替换，加所有日志）
  private registerWebviewMessageListener(context: vscode.ExtensionContext) {
    if (!this.panel) {
      console.error("扩展端：面板未初始化，无法注册消息监听");
      return;
    }

    console.log("扩展端：已注册Webview消息监听，等待前端消息");
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        // 核心日志：打印收到的所有前端消息，确认是否有send-message
        console.log("扩展端收到前端消息：", JSON.stringify(message));
        if (!message.type) {
          console.warn("扩展端：收到无类型的无效消息");
          return;
        }

        switch (message.type) {
          case 'request-config':
            console.log("扩展端：收到前端的配置请求，开始返回config-data");
            this.handleConfigRequest(); 
            break;
          case 'send-message':
            // 校验参数是否完整
            const { content, provider } = message;
            console.log("扩展端：收到前端发送的用户消息，内容：", content, "服务商：", provider);
            if (!content?.trim()) {
              console.error("扩展端：收到的send-message消息内容为空");
              return;
            }
            if (!provider) {
              console.error("扩展端：收到的send-message缺少服务商provider");
              return;
            }
            // 执行流式请求
            await this.handleSendMessage(content, provider);
            break;
          case 'clear-messages':
            console.log("扩展端：收到前端的清空消息请求");
            this.handleClearMessages();
            break;
          default:
            console.warn(`扩展端：未处理的消息类型：${message.type}`);
        }
      },
      null,
      context.subscriptions
    );
  }

  // 处理配置请求（同步方法）
  // WebviewManager.ts - 修正handleConfigRequest，加去重标记
  private hasSentConfig = false; // 新增：类级别的去重标记
  private handleConfigRequest() {
    if (!this.panel || this.hasSentConfig) return; // 已发送则直接返回

    const currentProvider = ConfigManager.getCurrentProvider();
    const proxyEnabled = ConfigManager.getProxyEnabled();
    console.log("扩展端：首次发送配置数据", { currentProvider, proxyEnabled });

    setTimeout(() => {
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'config-data',
          data: { provider: currentProvider, proxyEnabled: proxyEnabled }
        });
        this.hasSentConfig = true; // 标记为已发送
      }
    }, 50);
  }
  // WebviewManager.ts - handleSendMessage
  private async handleSendMessage(content: string, provider: string) {
    
    console.log("扩展端：进入handleSendMessage方法，开始处理AI请求", content, provider);
    if (!this.panel || !this.panel.webview || !content?.trim()) {
      console.error("扩展端：handleSendMessage前置校验失败，面板/内容为空");
      return;
    }

    const responseId = `ai_${Date.now()}`;
    // 初始化fullContent为""（避免初始内容为空）
    let fullContent = "";
    // 流式开始时，先发送空内容+loading状态（确保前端渲染AI消息容器）
    this.panel.webview.postMessage({
      type: 'message-stream',
      data: {
        id: responseId,
        content: "正在思考...", // 初始loading内容
        role: 'assistant',     // 必须是assistant
        timestamp: Date.now(), // 必须有时间戳
        isDone: false
      }
    });

    try {
      const stream = MultiAiService.callApiStream(content);
      for await (const chunk of stream) {
        if (!chunk || !this.panel) break;
        fullContent += chunk;
        // 发送分块内容（必须包含所有Message字段）
        this.panel.webview.postMessage({
          type: 'message-stream',
          data: {
            id: responseId,
            content: fullContent,
            role: 'assistant',
            timestamp: Date.now(),
            isDone: false
          }
        });
      }

      // 流式结束，标记isDone=true
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'message-stream',
          data: {
            id: responseId,
            content: fullContent || "抱歉，未获取到回复", // 兜底内容
            role: 'assistant',
            timestamp: Date.now(),
            isDone: true
          }
        });
      }
    } catch (error) {
      const errorMsg = (error as Error).message || '请求失败';
      this.panel?.webview.postMessage({
        type: 'message-stream',
        data: {
          id: responseId,
          content: `❌ ${errorMsg}`,
          role: 'assistant',
          timestamp: Date.now(),
          isDone: true
        }
      });
    }
  }
  // private async handleSendMessage(content: string, provider: string) {
  //   // 严格校验
  //   if (!this.panel || !this.panel.webview || !content?.trim()) {
  //     console.error('面板/Webview未初始化或消息为空');
  //     return;
  //   }

  //   console.log(`扩展端收到消息：${content}（服务商：${provider}）`);

  //   try {
  //     const aiResponse = await MultiAiService.callApi(content);
  //     console.log(`AI响应成功：${aiResponse.substring(0, 50)}...`);

  //     // 延迟发送，确保前端loading消息已渲染
  //     setTimeout(() => {
  //       if (this.panel && this.panel.webview) {
  //         const aiMessage = {
  //           id: Date.now().toString(),
  //           content: aiResponse,
  //           role: 'assistant',
  //           timestamp: Date.now()
  //         };
  //         // 发送消息并打印日志
  //         this.panel.webview.postMessage({
  //           type: 'message-response',
  //           data: aiMessage
  //         });
  //         console.log('AI消息已发送到前端：', aiMessage.id);
  //       }
  //     }, 200);

  //   } catch (error) {
  //     const errorMsg = (error as Error).message || '未知错误';
  //     console.error(`API调用失败：${errorMsg}`);

  //     setTimeout(() => {
  //       if (this.panel && this.panel.webview) {
  //         this.panel.webview.postMessage({
  //           type: 'message-response',
  //           data: {
  //             id: Date.now().toString(),
  //             content: `请求失败：${errorMsg}`,
  //             role: 'assistant',
  //             timestamp: Date.now()
  //           }
  //         });
  //       }
  //     }, 200);
  //   }
  // }

  // 处理清空消息
  private handleClearMessages() {
    if (!this.panel) return;

    setTimeout(() => {
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'messages-cleared',
          data: { timestamp: Date.now() }
        });
      }
    }, 50);
  }

  // WebviewManager.ts 中的 getWebviewHtml 方法（完整替换）
  // WebviewManager.ts 中的 getWebviewHtml 方法（完整替换）
  private getWebviewHtml(context: vscode.ExtensionContext) {
    // 仅拼接单个bundle.js的路径，用asWebviewUri转换（VS Code安全要求）
    const bundleJsUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'out/webview/react/bundle.js'))
    );

    // HTML模板：无CSS加载 + 仅加载bundle.js + 必加type="module"
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Coding Agent</title>
        <!-- 绝对无CSS加载标签，CSS已内联到bundle.js -->
      </head>
      <body>
        <div id="root"></div>
        <script>
          // 注入VS Code API和初始配置，供前端React使用
          window.vscode = acquireVsCodeApi();
          window.initConfig = ${JSON.stringify({
            provider: ConfigManager.getCurrentProvider(),
            proxyEnabled: ConfigManager.getProxyEnabled()
          })};
        </script>
        <!-- 核心：加载单个bundle.js，必须加type="module"，解决import语法错误 -->
        <script type="module" src="${bundleJsUri}"></script>
      </body>
      </html>
    `;
  }
}