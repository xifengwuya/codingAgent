import { ConfigManager } from './configManager';

// 1. 抽象基础AI服务类（新增流式抽象方法）
abstract class BaseAiService {
  protected token: string;
  constructor(token: string) {
    this.token = token;
    console.log(`[BaseAiService] 初始化服务商，token是否存在：${!!token}`);
  }
  
  // 普通调用（原有）
  abstract callApi(content: string): Promise<string>;
  
  // 流式调用（新增抽象方法）
  abstract callApiStream(content: string): AsyncGenerator<string>;
}

// 2. DeepSeek实现（新增流式逻辑 + 全量日志）
class DeepSeekService extends BaseAiService {
  // 普通调用（原有）
  async callApi(content: string): Promise<string> {
    if (!this.token) throw new Error('DeepSeek Token未配置');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
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
    if (!response.ok) throw new Error(data.error?.message || `请求失败，状态码：${response.status}`);
    return data.choices[0].message.content;
  }

  // 流式调用（新增核心 + 全量日志）
  async *callApiStream(content: string): AsyncGenerator<string> {
    console.log("===== DeepSeekService.callApiStream 开始 =====");
    console.log("请求内容：", content);
    console.log("Token是否配置：", !!this.token);

    // 1. 校验Token
    if (!this.token) {
      console.error("[DeepSeek] Token未配置，抛出异常");
      throw new Error('DeepSeek Token未配置');
    }

    try {
      // 2. 构造请求参数
      const requestBody = {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content }],
        temperature: 0.7,
        stream: true, // 开启流式
        stream_options: { include_usage: false }
      };
      console.log("[DeepSeek] 构造请求体：", JSON.stringify(requestBody));

      // 3. 发送请求
      console.log("[DeepSeek] 开始发送流式请求：https://api.deepseek.com/v1/chat/completions");
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'api-key': this.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // 4. 校验响应状态
      console.log("[DeepSeek] 响应状态：", response.status, response.statusText);
      if (!response.ok) {
        const errData = await response.json().catch(err => ({ error: { message: "解析错误响应失败" } }));
        console.error("[DeepSeek] 请求失败，错误详情：", errData);
        throw new Error(errData.error?.message || `请求失败，状态码：${response.status}`);
      }

      // 5. 初始化流读取器
      if (!response.body) {
        console.error("[DeepSeek] 响应体无流数据");
        throw new Error('响应体无流数据');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      console.log("[DeepSeek] 开始读取流式响应...");

      // 6. 逐块解析流
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[DeepSeek] 流式响应读取完成");
          break;
        }

        // 解码并拼接数据
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完成的行
        console.log(`[DeepSeek] 收到流分块，共${lines.length}行，未完成行：${buffer.length}字符`);

        // 解析每一行数据
        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          const dataStr = line.slice(6); // 去掉 "data: " 前缀
          console.log(`[DeepSeek] 解析流行：${dataStr.slice(0, 100)}${dataStr.length > 100 ? '...' : ''}`);
          
          if (dataStr === '[DONE]') {
            console.log("[DeepSeek] 收到流式结束标记 [DONE]");
            continue;
          }

          try {
            const data = JSON.parse(dataStr);
            const chunk = data.choices[0]?.delta?.content || '';
            if (chunk) {
              console.log(`[DeepSeek] 提取到内容块：${chunk}`);
              yield chunk; // 分块返回内容
            } else {
              console.log("[DeepSeek] 该分块无有效内容：", data);
            }
          } catch (e) {
            console.warn('[DeepSeek] 解析流式数据失败：', e, '原始数据：', dataStr);
          }
        }
      }
    } catch (e) {
      console.error("[DeepSeek] 流式调用异常：", e);
      throw e; // 抛出异常让上层捕获
    } finally {
      console.log("===== DeepSeekService.callApiStream 结束 =====");
    }
  }
}

// 3. 阿里云实现（新增流式逻辑 + 全量日志）
class AliyunService extends BaseAiService {
  // 普通调用（原有）
  async callApi(content: string): Promise<string> {
    if (!this.token) throw new Error('阿里云API Key未配置');
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { prompt: content },
        parameters: { temperature: 0.7 }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `请求失败，状态码：${response.status}`);
    return data.output.text;
  }

  // 替换 AliyunService 中的 callApiStream 方法（仅修改流解析逻辑）
  async *callApiStream(content: string): AsyncGenerator<string> {
    console.log("===== AliyunService.callApiStream 开始 =====");
    console.log("请求内容：", content);
    console.log("API Key是否配置：", !!this.token);

    // 1. 校验API Key
    if (!this.token) {
      console.error("[阿里云] API Key未配置，抛出异常");
      throw new Error('阿里云API Key未配置');
    }

    try {
      // 2. 构造请求参数
      const requestBody = {
        model: 'qwen-turbo',
        input: { prompt: content },
        parameters: { 
          temperature: 0.7,
          result_format: 'stream', // 开启流式
          incremental_output: true // 增量输出
        }
      };
      console.log("[阿里云] 构造请求体：", JSON.stringify(requestBody));

      // 3. 发送请求
      console.log("[阿里云] 开始发送流式请求：https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation");
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // 4. 校验响应状态
      console.log("[阿里云] 响应状态：", response.status, response.statusText);
      if (!response.ok) {
        const errData = await response.json().catch(err => ({ error: { message: "解析错误响应失败" } }));
        console.error("[阿里云] 请求失败，错误详情：", errData);
        throw new Error(errData.error?.message || `请求失败，状态码：${response.status}`);
      }

      // 5. 初始化流读取器
      if (!response.body) {
        console.error("[阿里云] 响应体无流数据");
        throw new Error('响应体无流数据');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      console.log("[阿里云] 开始读取流式响应...");

      // 6. 逐块解析流（核心修复：字段路径 + 流式格式适配）
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[阿里云] 流式响应读取完成");
          // 处理最后剩余的buffer
          if (buffer) {
            console.log(`[阿里云] 处理剩余buffer：${buffer}`);
            try {
              const data = JSON.parse(buffer);
              // 修复：使用正确的字段路径
              const chunk = data.output?.choices?.[0]?.message?.content || '';
              if (chunk) {
                console.log(`[阿里云] 剩余buffer提取到内容：${chunk}`);
                yield chunk;
              }
            } catch (e) {
              console.warn('[阿里云] 解析剩余buffer失败：', e);
            }
          }
          break;
        }

        // 解码数据（阿里云流式响应是完整JSON，无需按行拆分）
        buffer += decoder.decode(value);
        
        try {
          // 核心修复1：阿里云流式响应是完整的JSON对象，直接解析整个buffer
          const data = JSON.parse(buffer);
          buffer = ''; // 解析完成后清空buffer
          
          // 核心修复2：使用正确的字段路径提取内容
          const chunk = data.output?.choices?.[0]?.message?.content || '';
          if (chunk) {
            console.log(`[阿里云] 提取到内容块：${chunk}`);
            yield chunk;
          } else {
            console.log("[阿里云] 该分块无有效内容（字段路径错误）：", JSON.stringify(data).slice(0, 200) + '...');
          }
        } catch (e) {
          // 若buffer未拼接完成，继续拼接（避免JSON解析失败）
          console.log(`[阿里云] 暂未拼接完成完整JSON，当前buffer长度：${buffer.length}`);
        }
      }
    } catch (e) {
      console.error("[阿里云] 流式调用异常：", e);
      throw e;
    } finally {
      console.log("===== AliyunService.callApiStream 结束 =====");
    }
  }
}

// 4. 多服务商入口（新增流式统一方法 + 全量日志）
export class MultiAiService {
  // 普通调用（原有）
  public static async callApi(content: string): Promise<string> {
    const provider = await ConfigManager.getCurrentProvider();
    let service: BaseAiService;

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

    if (ConfigManager.getProxyEnabled()) {
      // 代理逻辑（如需）
    }
    return service.callApi(content);
  }

  // 流式调用（新增核心 + 全量日志）
  public static async *callApiStream(content: string): AsyncGenerator<string> {
    console.log("===== MultiAiService.callApiStream 开始 =====");
    console.log("用户输入内容：", content);

    try {
      // 1. 获取当前服务商
      const provider = await ConfigManager.getCurrentProvider();
      console.log("当前选择的服务商：", provider);
      let service: BaseAiService;

      // 2. 初始化对应服务商的服务类
      switch (provider) {
        case 'deepseek':
          const deepseekToken = ConfigManager.getDeepSeekToken();
          console.log("[MultiAi] DeepSeek Token获取结果：", !!deepseekToken);
          service = new DeepSeekService(deepseekToken);
          break;
        case 'aliyun':
          const aliyunApiKey = ConfigManager.getAliyunApiKey();
          console.log("[MultiAi] 阿里云API Key获取结果：", !!aliyunApiKey);
          service = new AliyunService(aliyunApiKey);
          break;
        default:
          console.error(`[MultiAi] 不支持的服务商：${provider}`);
          throw new Error(`不支持的服务商：${provider}`);
      }

      // 3. 检查代理配置
      const proxyEnabled = ConfigManager.getProxyEnabled();
      console.log("[MultiAi] 代理是否开启：", proxyEnabled);
      if (proxyEnabled) {
        console.log("[MultiAi] 代理已开启（如需实现代理逻辑，在此补充）");
        // 代理逻辑（如需）
      }
      
      // 4. 调用对应服务商的流式方法并转发结果
      console.log(`[MultiAi] 开始调用${provider}的流式方法`);
      yield* service.callApiStream(content);

    } catch (error) {
      console.error("[MultiAi] 流式调用全局异常：", error);
      // 异常兜底：返回友好提示给前端
      yield `调用失败：${(error as Error).message || "未知错误"}`;
    } finally {
      console.log("===== MultiAiService.callApiStream 结束 =====");
    }
  }
}