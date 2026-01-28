import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

// 独立Markdown渲染组件（无任何TypeScript报错）
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 定义自定义组件（抽离出来，避免断言位置错误）
  const customComponents = {
    // 代码块高亮（VS Code风格）
    code: ({ node, className, children, ...props }: any) => {
      const isInline = node?.type === 'inlineCode';
      const match = /language-(\w+)/.exec(className || '');
      
      return !isInline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          wrapLines={true}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code 
          className={className} 
          style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}
          {...props}
        >
          {children}
        </code>
      );
    },
    // 基础样式优化
    h3: ({ children, ...props }: any) => (
      <h3 style={{ margin: '8px 0', fontSize: '1.1em' }} {...props}>
        {children || ''}
      </h3>
    ),
    ul: ({ children, ...props }: any) => (
      <ul style={{ margin: '4px 0', paddingLeft: '20px' }} {...props}>
        {children || ''}
      </ul>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote 
        style={{ 
          margin: '4px 0', 
          padding: '4px 8px', 
          borderLeft: '3px solid #0078d4',
          backgroundColor: '#f5f5f5' 
        }}
        {...props}
      >
        {children || ''}
      </blockquote>
    )
  };

  return (
    <ReactMarkdown
      // 核心修正：类型断言写在变量后，而非对象内部
      components={customComponents as any}
      children={content}
    />
  );
};

// 显式使用React消除未使用警告
React;

export default MarkdownRenderer;