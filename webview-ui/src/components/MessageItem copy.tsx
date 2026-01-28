import React from 'react';
import { Message } from '../globalTypes';
import { COLORS, SIZES, ANIMATIONS } from '../constants/style';
import MarkdownRenderer from './MarkdownRenderer'; // 导入渲染组件

interface MessageItemProps {
  message: Message;
  formatTime: (timestamp: number) => string;
  isStreaming?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, formatTime, isStreaming }) => {
  const isLoading = message.id.startsWith('loading_') && !isStreaming;

  return (
    <div style={{
      margin: '8px 0',
      padding: `${SIZES.padding}px`,
      backgroundColor: message.role === 'user' ? COLORS.primaryLight : COLORS.grayLight,
      borderRadius: SIZES.borderRadius,
      maxWidth: SIZES.messageMaxWidth,
      marginLeft: message.role === 'user' ? 'auto' : 0,
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontWeight: 600,
        fontSize: 14,
        marginBottom: 4,
        color: message.role === 'user' ? COLORS.primary : COLORS.black,
      }}>
        {message.role === 'user' ? '你' : 'AI'}
        <span style={{ fontWeight: 'normal', color: COLORS.grayText, marginLeft: 8, fontSize: 12 }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 14 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 16, height: 16, border: '2px solid #ccc', borderTop: `2px solid ${COLORS.primary}`, borderRadius: '50%', animation: ANIMATIONS.spin }}></span>
            思考中...
          </div>
        ) : (
          <MarkdownRenderer content={message.content} /> // 替换为Markdown渲染
        )}
      </div>
    </div>
  );
};

export default MessageItem;