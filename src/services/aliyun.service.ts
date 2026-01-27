import { ApiService } from './apiService.interface';

// 阿里云 API 服务实现
export class AliyunApiService implements ApiService {
  async callApi(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [{ role: 'user', content: prompt }]
        },
        parameters: {
          result_format: 'message'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`阿里云 API 请求失败: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', data); // 添加这行来查看实际响应结构

    // 根据实际的 API 响应结构调整访问路径
    if (data.output && data.output.choices && data.output.choices[0]) {
      return data.output.choices[0].message?.content || '';
    } else if (data.output && data.output.text) {
      return data.output.text;
    } else {
      console.error('Unexpected response format:', data);
      throw new Error('API 响应格式不符合预期');
    }
    
  }
}