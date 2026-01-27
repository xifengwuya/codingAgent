// webview-ui/src/main.tsx
// 强制指定文件为模块，避免TS解析异常
export {};

// 1. 完整导入React（包含JSX解析所需的类型）
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

// 2. 明确导入组件（确保是值而非类型）
import ChatPanel from './components/ChatPanel/ChatPanel';

// 3. 防御性检查（类型断言确保非空）
const rootElement = document.getElementById('root') as HTMLElement;
if (!rootElement) {
  console.error('Webview中未找到#root节点，请检查index.html是否包含<div id="root"></div>');
} else {
  // 4. 显式创建根节点（避免隐式类型转换）
  const root = ReactDOM.createRoot(rootElement);
  
  // 5. 确保JSX标签完全闭合，无任何语法瑕疵
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(ChatPanel, null)
    )
  );
}