// src/services/apiServiceProvider.ts
export class ApiServiceProvider {
    // 获取所有服务商
    static getAllProviders() {
        return this.providers;
    }
    // 验证服务商是否支持
    static isValidProvider(provider) {
        return this.providers.includes(provider);
    }
}
// 支持的服务商列表（易扩展）
ApiServiceProvider.providers = ['deepseek', 'aliyun', 'openai'];
