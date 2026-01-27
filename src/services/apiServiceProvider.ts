// src/services/apiServiceProvider.ts
export class ApiServiceProvider {
  // 支持的服务商列表（易扩展）
  private static providers = ['deepseek', 'aliyun', 'openai'];

  // 获取所有服务商
  public static getAllProviders(): string[] {
    return this.providers;
  }

  // 验证服务商是否支持
  public static isValidProvider(provider: string): boolean {
    return this.providers.includes(provider);
  }
}