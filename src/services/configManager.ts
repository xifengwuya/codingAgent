import * as vscode from 'vscode';

// 配置键名（统一管理）
const CONFIG_ROOT = 'coding-agent-chat'; // 配置根节点
const CONFIG_KEYS = {
  currentProvider: 'provider', 
  deepseekToken: 'deepseekToken',
  aliyunApiKey: 'aliyunApiKey',
  proxyEnabled: 'proxyEnabled',
  proxyAddress: 'proxyAddress'
};

export class ConfigManager {
  // 获取VS Code配置实例（指定根节点，避免路径错误）
  private static getConfig() {
    return vscode.workspace.getConfiguration(CONFIG_ROOT);
  }

  // 服务商配置（改为同步方法，杜绝Promise问题）
  public static getCurrentProvider(): string {
    return this.getConfig().get<string>(CONFIG_KEYS.currentProvider, 'deepseek');
  }
  public static async setCurrentProvider(provider: string) {
    await this.getConfig().update(CONFIG_KEYS.currentProvider, provider, vscode.ConfigurationTarget.Global);
  }

  // Token/Key配置
  public static getDeepSeekToken(): string {
    return this.getConfig().get<string>(CONFIG_KEYS.deepseekToken, '');
  }
  public static getAliyunApiKey(): string {
    return this.getConfig().get<string>(CONFIG_KEYS.aliyunApiKey, '');
  }

  // 代理配置
  public static getProxyEnabled(): boolean {
    return this.getConfig().get<boolean>(CONFIG_KEYS.proxyEnabled, false);
  }
  public static getProxyAddress(): string {
    return this.getConfig().get<string>(CONFIG_KEYS.proxyAddress, '');
  }
}