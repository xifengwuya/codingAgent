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
    static getConfig() {
        return vscode.workspace.getConfiguration(CONFIG_ROOT);
    }
    // 服务商配置（改为同步方法，杜绝Promise问题）
    static getCurrentProvider() {
        return this.getConfig().get(CONFIG_KEYS.currentProvider, 'deepseek');
    }
    static async setCurrentProvider(provider) {
        await this.getConfig().update(CONFIG_KEYS.currentProvider, provider, vscode.ConfigurationTarget.Global);
    }
    // Token/Key配置
    static getDeepSeekToken() {
        return this.getConfig().get(CONFIG_KEYS.deepseekToken, '');
    }
    static getAliyunApiKey() {
        return this.getConfig().get(CONFIG_KEYS.aliyunApiKey, '');
    }
    // 代理配置
    static getProxyEnabled() {
        return this.getConfig().get(CONFIG_KEYS.proxyEnabled, false);
    }
    static getProxyAddress() {
        return this.getConfig().get(CONFIG_KEYS.proxyAddress, '');
    }
}
