// src/types/model.ts
export type ModelProvider = 'deepseek' | 'aliyun' | 'openai' | 'claude' | 'kimi' | 'openrouter';
export type ModelName = 
  | 'deepseek-chat' 
  | 'qwen-turbo' 
  | 'gpt-3.5-turbo' 
  | 'gpt-4' 
  | 'claude-3-sonnet' 
  | 'kimi-pro' 
  | 'openrouter-default';

// 单个模型的配置结构
export interface ModelConfig {
  provider: ModelProvider; // 服务商
  model: ModelName; // 具体模型
  apiKey: string; // API密钥（不同厂商命名统一为apiKey）
  baseUrl?: string; // 自定义接口地址（适配代理/私有化部署）
  temperature: number; // 通用参数
  maxTokens?: number; // 通用参数
  enabled: boolean; // 是否启用
}

// 全局模型配置
export interface GlobalModelConfig {
  currentModel: ModelName; // 当前选中的模型
  models: Record<ModelName, ModelConfig>; // 所有模型的配置
}