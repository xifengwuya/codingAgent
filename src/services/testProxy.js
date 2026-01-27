// src/services/testProxy.ts
import * as vscode from 'vscode';
export async function testProxy() {
    try {
        const response = await fetch('https://httpbin.org/ip', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Proxy test successful:', data);
            vscode.window.showInformationMessage('代理测试成功！');
        }
        else {
            console.error('Proxy test failed:', response.statusText);
            vscode.window.showErrorMessage('代理测试失败！');
        }
    }
    catch (error) {
        console.error('Proxy test error:', error);
        // 安全地处理错误信息
        let errorMessage = '未知错误';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else if (typeof error === 'string') {
            errorMessage = error;
        }
        vscode.window.showErrorMessage('代理测试出错：' + errorMessage);
    }
}
