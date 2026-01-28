// src/extension.ts
import * as vscode from 'vscode';
import { MultiAiService } from './services/multiAi.service';
import { ApiServiceProvider } from './services/apiServiceProvider';
import { ConfigManager } from './services/configManager';
import { testProxy } from './services/testProxy';
import { WebviewManager } from './webview/webviewManager';
process.noDeprecation = true; // 禁用弃用警告
export function activate(context: vscode.ExtensionContext) {
  // 设置 AI 服务提供商
  const setProviderCmd = vscode.commands.registerCommand(
    'extension.setAiProvider',
    async () => {
      const providers = ApiServiceProvider.getAllProviders();
      const provider = await vscode.window.showQuickPick(providers, {
        placeHolder: '选择 AI 服务提供商'
      });
      
      if (provider) {
        await ConfigManager.setCurrentProvider(provider);
        vscode.window.showInformationMessage(`已切换到 ${provider} 服务`);
      }
    }
  );

  // 设置 DeepSeek Token
  const setDeepSeekCmd = vscode.commands.registerCommand(
    'extension.setDeepSeekToken',
    async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings', 
        'coding-agent-chat.deepseekToken'
      );
    }
  );

  // 设置阿里云 API Key
  const setAliyunCmd = vscode.commands.registerCommand(
    'extension.setAliyunApiKey',
    async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings', 
        'coding-agent-chat.aliyunApiKey'
      );
    }
  );

  // 测试当前 API
  const testApiCmd = vscode.commands.registerCommand(
    'extension.testCurrentApi',
    async () => {
      try {
        const provider = ConfigManager.getCurrentProvider();
        vscode.window.showInformationMessage(`正在测试 ${provider} API...`);
        
        const result = await MultiAiService.callApi('Hello, please reply with a simple greeting.');
        
        // 添加调试日志
        console.log('Call API result:', result); // 检查实际返回值
        
        // 添加空值检查
        if (result === undefined || result === null) {
          vscode.window.showErrorMessage(`API 测试失败: API 返回结果为空`);
          return;
        }
        
        vscode.window.showInformationMessage(`API 测试成功: ${result.substring(0, 50)}...`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`API 测试失败: ${errorMessage}`);
      }
    }
  );
  
  // 测试代理连接
  const testProxyCmd = vscode.commands.registerCommand(
    'extension.testProxy',
    async () => {
      try {
        vscode.window.showInformationMessage('正在测试代理连接...');
        await testProxy();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`代理测试失败: ${errorMessage}`);
      }
    }
  );

  // 打开聊天面板命令
  // src/extension.ts 中 showChatPanelCmd 部分
  const showChatPanelCmd = vscode.commands.registerCommand(
    'extension.showChatPanel',
    async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const webviewManager = WebviewManager.getInstance();
        webviewManager.showPanel(context); // 确保传递了 extension context
        vscode.window.showInformationMessage('正在打开AI编程助手面板...');
      } catch (error) {
        vscode.window.showErrorMessage(`打开聊天面板失败: ${(error as Error).message}`);
        console.error('面板打开失败:', error);
      }
    }
  );
  
  // 调试信息
  console.log('Current provider:', ConfigManager.getCurrentProvider());
  console.log('DeepSeek token exists:', !!ConfigManager.getDeepSeekToken());
  console.log('Aliyun key exists:', !!ConfigManager.getAliyunApiKey());

  context.subscriptions.push(
    setProviderCmd, 
    setDeepSeekCmd, 
    setAliyunCmd, 
    testApiCmd,
    testProxyCmd, 
    showChatPanelCmd
  );
}

export function deactivate() {}