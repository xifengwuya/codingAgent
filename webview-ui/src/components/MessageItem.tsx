import React from 'react';
import { Message } from '../globalTypes';
import { COLORS, SIZES, ANIMATIONS } from '../constants/style';

interface MessageItemProps {
  message: Message;
  formatTime: (timestamp: number) => string;
}

// 消息项组件，抽离复用，降低 ChatPanel 复杂度
const MessageItem: React.FC<MessageItemProps> = ({ message, formatTime }) => {
  // 加载中状态（AI 思考中）
  const isLoading = message.id.startsWith('loading_');

  return (
    <div 
      style={{
        margin: '8px 0',
        padding: `${SIZES.padding}px`,
        backgroundColor: message.role === 'user' ? COLORS.primaryLight : COLORS.grayLight,
        borderRadius: SIZES.borderRadius,
        maxWidth: SIZES.messageMaxWidth,
        marginLeft: message.role === 'user' ? 'auto' : 0,
        boxSizing: 'border-box',
        animation: ANIMATIONS.slideUp,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{
        fontWeight: 600,
        fontSize: 14,
        marginBottom: 4,
        color: message.role === 'user' ? COLORS.primary : COLORS.black,
      }}>
        {message.role === 'user' ? '你' : 'AI'}
        <span style={{
          fontWeight: 'normal',
          color: COLORS.grayText,
          marginLeft: 8,
          fontSize: 12,
        }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div style={{
        marginTop: 4,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        fontSize: 14,
        color: COLORS.black,
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 16,
              height: 16,
              border: '2px solid #ccc',
              borderTop: `2px solid ${COLORS.primary}`,
              borderRadius: '50%',
              animation: ANIMATIONS.spin,
            }}></span>
            {message.content}
          </div>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
};

export default MessageItem;