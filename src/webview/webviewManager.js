import * as vscode from 'vscode';
import { ConfigManager } from '../services/configManager';
import { MultiAiService } from '../services/multiAi.service';
import * as path from 'path';
export class WebviewManager {
    constructor() { }
    static getInstance() {
        if (!WebviewManager.instance) {
            WebviewManager.instance = new WebviewManager();
        }
        return WebviewManager.instance;
    }
    // 显示Webview面板
    showPanel(context) {
        if (this.panel) {
            this.panel.dispose();
        }
        // 1. 创建面板（核心修复：localResourceRoots 指向文件而非目录）
        // WebviewManager.ts - showPanel 方法
        this.panel = vscode.window.createWebviewPanel('coding-agent-chat', 'AI 编程助手', { viewColumn: vscode.ViewColumn.Three, preserveFocus: false }, {
            enableScripts: true,
            retainContextWhenHidden: true,
            // 🌟 核心修复：指向扩展根目录，而非 webview 子目录
            localResourceRoots: [vscode.Uri.file(context.extensionPath)],
            // 禁用自动样式加载（可选）
            enableFindWidget: false,
            enableCommandUris: false
        });
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
    registerWebviewMessageListener(context) {
        if (!this.panel)
            return;
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'request-config':
                    this.handleConfigRequest(); // 同步方法，移除await
                    break;
                case 'send-message':
                    await this.handleSendMessage(message.content, message.provider);
                    break;
                case 'clear-messages':
                    this.handleClearMessages();
                    break;
                default:
                    console.warn(`未处理的消息类型：${message.type}`);
            }
        }, null, context.subscriptions);
    }
    // 处理配置请求（同步方法）
    handleConfigRequest() {
        if (!this.panel)
            return;
        // 核心修复：同步获取配置，无Promise
        const currentProvider = ConfigManager.getCurrentProvider();
        const proxyEnabled = ConfigManager.getProxyEnabled();
        // 延迟发送，确保前端监听已注册
        setTimeout(() => {
            if (this.panel) {
                this.panel.webview.postMessage({
                    type: 'config-data',
                    data: { provider: currentProvider, proxyEnabled: proxyEnabled }
                });
            }
        }, 50);
    }
    // 处理消息发送（核心修复：状态校验+详细日志）
    async handleSendMessage(content, provider) {
        // 严格校验
        if (!this.panel || !this.panel.webview || !content?.trim()) {
            console.error('面板/Webview未初始化或消息为空');
            return;
        }
        console.log(`扩展端收到消息：${content}（服务商：${provider}）`);
        try {
            const aiResponse = await MultiAiService.callApi(content);
            console.log(`AI响应成功：${aiResponse.substring(0, 50)}...`);
            // 延迟发送，确保前端loading消息已渲染
            setTimeout(() => {
                if (this.panel && this.panel.webview) {
                    const aiMessage = {
                        id: Date.now().toString(),
                        content: aiResponse,
                        role: 'assistant',
                        timestamp: Date.now()
                    };
                    // 发送消息并打印日志
                    this.panel.webview.postMessage({
                        type: 'message-response',
                        data: aiMessage
                    });
                    console.log('AI消息已发送到前端：', aiMessage.id);
                }
            }, 200);
        }
        catch (error) {
            const errorMsg = error.message || '未知错误';
            console.error(`API调用失败：${errorMsg}`);
            setTimeout(() => {
                if (this.panel && this.panel.webview) {
                    this.panel.webview.postMessage({
                        type: 'message-response',
                        data: {
                            id: Date.now().toString(),
                            content: `请求失败：${errorMsg}`,
                            role: 'assistant',
                            timestamp: Date.now()
                        }
                    });
                }
            }, 200);
        }
    }
    // 处理清空消息
    handleClearMessages() {
        if (!this.panel)
            return;
        setTimeout(() => {
            if (this.panel) {
                this.panel.webview.postMessage({
                    type: 'messages-cleared',
                    data: { timestamp: Date.now() }
                });
            }
        }, 50);
    }
    // WebviewManager.ts 中生成 HTML 的方法
    getWebviewHtml(context) {
        // 获取打包后的前端资源路径
        const reactDir = vscode.Uri.file(path.join(context.extensionPath, 'out/webview/react'));
        const reactUri = this.panel.webview.asWebviewUri(reactDir);
        // 加载打包后的 index.html
        return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Coding Agent</title>
      </head>
      <body>
        <div id="root"></div>
        <script>
          // 注入 VS Code API 到全局
          window.vscode = acquireVsCodeApi();
          // 注入初始配置
          window.initConfig = ${JSON.stringify({
            provider: ConfigManager.getCurrentProvider(),
            proxyEnabled: ConfigManager.getProxyEnabled()
        })};
        </script>
        <script src="${reactUri}/public.js"></script>
      </body>
      </html>
    `;
    }
}
