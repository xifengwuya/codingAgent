import * as vscode from 'vscode';
import { ConfigManager } from '../services/configManager';
import { MultiAiService } from '../services/multiAi.service';
import * as path from 'path';

export class WebviewManager {
  private static instance: WebviewManager;
  private panel?: vscode.WebviewPanel;
  private hasSentConfig = false; // 配置发送去重标记

  private constructor() {}

  // 单例模式获取实例
  public static getInstance(): WebviewManager {
    if (!WebviewManager.instance) {
      WebviewManager.instance = new WebviewManager();
    }
    return WebviewManager.instance;
  }

  // ===== 核心新增：获取当前面板实例（供MultiAiService回调使用）=====
  public getPanel(): vscode.WebviewPanel | null {
    return this.panel || null;
  }

  // 显示Webview面板
  public showPanel(context: vscode.ExtensionContext) {
    // 销毁已有面板
    if (this.panel) {
      this.panel.dispose();
    }
    this.hasSentConfig = false; // 重置配置发送标记

    // 1. 创建面板
    this.panel = vscode.window.createWebviewPanel(
      'coding-agent-chat',
      'AI 编程助手',
      { viewColumn: vscode.ViewColumn.Three, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'out/webview/react'))
        ],
        enableFindWidget: false,
        enableCommandUris: false
      }
    );

    // 2. 面板销毁回调
    this.panel.onDidDispose(() => {
      this.panel = undefined;
      console.log("扩展端：Webview面板已销毁");
    }, null, context.subscriptions);

    // 3. 注册消息监听
    this.registerWebviewMessageListener(context);

    // 4. 生成HTML内容
    this.panel.webview.html = this.getWebviewHtml(context);

    // 5. 强制显示面板
    this.panel.reveal(vscode.ViewColumn.Three);
    console.log("扩展端：Webview面板已创建并显示");
  }

  // 注册Webview消息监听
  private registerWebviewMessageListener(context: vscode.ExtensionContext) {
    if (!this.panel) {
      console.error("扩展端：面板未初始化，无法注册消息监听");
      return;
    }

    console.log("扩展端：已注册Webview消息监听，等待前端消息");
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        // 打印收到的所有前端消息（调试用）
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
            // 校验参数完整性
            const { content, provider } = message;
            console.log("扩展端：收到前端发送的用户消息，内容：", content, "服务商：", provider);
            
            if (!content?.trim()) {
              console.error("扩展端：收到的send-message消息内容为空");
              // 向前端发送错误提示
              this.panel?.webview.postMessage({
                type: 'ai-service-error',
                data: { message: '消息内容不能为空，请输入有效问题' }
              });
              return;
            }
            
            if (!provider) {
              console.error("扩展端：收到的send-message缺少服务商provider");
              // 向前端发送错误提示
              this.panel?.webview.postMessage({
                type: 'ai-service-error',
                data: { message: '未选择AI服务商，请先在扩展设置中选择服务商' }
              });
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

  // 处理配置请求（去重逻辑）
  private handleConfigRequest() {
    if (!this.panel || this.hasSentConfig) return;

    const currentProvider = ConfigManager.getCurrentProvider();
    const proxyEnabled = ConfigManager.getProxyEnabled();
    console.log("扩展端：首次发送配置数据", { currentProvider, proxyEnabled });

    setTimeout(() => {
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'config-data',
          data: { 
            provider: currentProvider, 
            proxyEnabled: proxyEnabled 
          }
        });
        this.hasSentConfig = true; // 标记为已发送
      }
    }, 50);
  }

  // 处理用户消息（流式响应）
  private async handleSendMessage(content: string, provider: string) {
    console.log("扩展端：进入handleSendMessage方法，开始处理AI请求", content, provider);
    
    if (!this.panel || !this.panel.webview || !content?.trim()) {
      console.error("扩展端：handleSendMessage前置校验失败，面板/内容为空");
      return;
    }

    const responseId = `ai_${Date.now()}`;
    let fullContent = "";

    // 发送初始loading状态
    this.panel.webview.postMessage({
      type: 'message-stream',
      data: {
        id: responseId,
        content: "正在思考...",
        role: 'assistant',
        timestamp: Date.now(),
        isDone: false
      }
    });

    try {
      // 调用MultiAiService的流式方法
      const stream = MultiAiService.callApiStream(content);
      
      // 逐块处理流式响应
      for await (const chunk of stream) {
        if (!chunk || !this.panel) break;
        
        fullContent += chunk;
        
        // 发送分块内容到前端
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

      // 流式结束，标记完成
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'message-stream',
          data: {
            id: responseId,
            content: fullContent || "抱歉，未获取到有效回复",
            role: 'assistant',
            timestamp: Date.now(),
            isDone: true
          }
        });
      }

    } catch (error) {
      const errorMsg = (error as Error).message || 'AI请求失败，请检查配置或网络';
      console.error(`扩展端：AI流式请求失败：${errorMsg}`);
      
      // 向前端发送错误消息（双重保障：既在message-stream中返回，也发送ai-service-error）
      if (this.panel) {
        // 1. 在消息流中标记错误
        this.panel.webview.postMessage({
          type: 'message-stream',
          data: {
            id: responseId,
            content: `❌ ${errorMsg}`,
            role: 'assistant',
            timestamp: Date.now(),
            isDone: true
          }
        });

        // 2. 发送独立的错误消息（供前端弹窗提示）
        this.panel.webview.postMessage({
          type: 'ai-service-error',
          data: { message: errorMsg }
        });
      }
    }
  }

  // 处理清空消息请求
  private handleClearMessages() {
    if (!this.panel) return;

    setTimeout(() => {
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'messages-cleared',
          data: { timestamp: Date.now() }
        });
        console.log("扩展端：已向前端发送清空消息指令");
      }
    }, 50);
  }

  // 生成Webview HTML内容
  private getWebviewHtml(context: vscode.ExtensionContext) {
    if (!this.panel) {
      return "<html><body><h1>面板未初始化</h1></body></html>";
    }

    // 转换bundle.js路径（VS Code安全要求）
    const bundleJsUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'out/webview/react/bundle.js'))
    );

    // HTML模板
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Coding Agent</title>
        <style>
          /* 基础样式重置 */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #ffffff;
            height: 100vh;
            overflow: hidden;
          }
          #root {
            height: 100%;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          // 注入VS Code API和初始配置
          window.vscode = acquireVsCodeApi();
          window.initConfig = ${JSON.stringify({
            provider: ConfigManager.getCurrentProvider(),
            proxyEnabled: ConfigManager.getProxyEnabled()
          })};
          
          // 全局错误监听（可选）
          window.addEventListener('error', (e) => {
            console.error('前端全局错误：', e.error);
            window.vscode.postMessage({
              type: 'frontend-error',
              data: { message: e.error?.message || '前端未知错误' }
            });
          });
        </script>
        <!-- 加载React打包文件 -->
        <script type="module" src="${bundleJsUri}"></script>
      </body>
      </html>
    `;
  }
}