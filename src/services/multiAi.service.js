// src/services/multiAi.service.ts
import { ConfigManager } from './configManager';
// 抽象基础AI服务类（易扩展）
class BaseAiService {
    constructor(token) {
        this.token = token;
    }
}
// DeepSeek实现
class DeepSeekService extends BaseAiService {
    async callApi(content) {
        if (!this.token)
            throw new Error('DeepSeek Token未配置');
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                // DeepSeek的鉴权头是 api-key，不是 Authorization: Bearer
                'api-key': this.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content }],
                temperature: 0.7
            })
        });
        const data = await response.json();
        if (!response.ok)
            throw new Error(data.error?.message || `请求失败，状态码：${response.status}`);
        return data.choices[0].message.content;
    }
}
// 阿里云实现（易扩展）
class AliyunService extends BaseAiService {
    async callApi(content) {
        if (!this.token)
            throw new Error('阿里云API Key未配置');
        // 阿里云通义千问的API地址（需替换为实际地址）
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`, // 阿里云用 Bearer Token
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-turbo',
                input: { prompt: content },
                parameters: { temperature: 0.7 }
            })
        });
        const data = await response.json();
        if (!response.ok)
            throw new Error(data.error?.message || `请求失败，状态码：${response.status}`);
        return data.output.text;
    }
}
// 多服务商入口（核心：根据配置切换，低耦合）
export class MultiAiService {
    static async callApi(content) {
        const provider = await ConfigManager.getCurrentProvider();
        let service;
        // 根据服务商创建对应实例
        switch (provider) {
            case 'deepseek':
                service = new DeepSeekService(ConfigManager.getDeepSeekToken());
                break;
            case 'aliyun':
                service = new AliyunService(ConfigManager.getAliyunApiKey());
                break;
            default:
                throw new Error(`不支持的服务商：${provider}`);
        }
        // 调用API（支持代理，可选）
        if (ConfigManager.getProxyEnabled()) {
            // 代理逻辑（略）
        }
        return service.callApi(content);
    }
}
