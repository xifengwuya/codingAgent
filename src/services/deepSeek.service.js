// DeepSeek API 服务实现
export class DeepSeekApiService {
    async callApi(prompt, token) {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`DeepSeek API 请求失败: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
}
