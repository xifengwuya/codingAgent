import { Message } from '../globalTypes';
import { COLORS, SIZES } from '../constants/style';

interface MessageItemProps {
  message: Message;
  formatTime: (timestamp: number) => string;
  isStreaming: boolean;
}

const MessageItem = ({
  message,
  formatTime,
  isStreaming,
}: MessageItemProps) => {
  const isUser = message.role === 'user';
  
  // 消息内容格式化（支持代码块）
  const formatMessageContent = (content: string) => {
    return {
      __html: content.replace(
        /```([\s\S]*?)```/g,
        (_, code) => `<div class="code-block">${code}</div>`
      )
    };
  };

  return (
    <div style={{
      display: 'flex',
      marginBottom: `${SIZES.padding}px`,
      marginLeft: isUser ? 'auto' : 0,
      maxWidth: '85%',
    }}>
      {/* 头像：豆包式极简设计 */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: isUser ? COLORS.primary : COLORS.grayLight,
        color: isUser ? COLORS.white : COLORS.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isUser ? 0 : 8,
        marginLeft: isUser ? 8 : 0,
        flexShrink: 0,
        fontSize: 14,
      }}>
        {isUser ? '你' : 'AI'}
      </div>
      
      {/* 消息气泡：现代化样式 */}
      <div style={{
        background: isUser ? COLORS.primary : COLORS.white,
        color: isUser ? COLORS.white : COLORS.black,
        borderRadius: 16,
        padding: `${SIZES.padding - 4}px ${SIZES.padding}px`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        position: 'relative',
        fontSize: 14,
        lineHeight: 1.6,
      }}>
        {/* 流式加载动效 */}
        {isStreaming && <div className="loading-shimmer"></div>}
        
        {/* 消息内容（支持代码块） */}
        <div 
          dangerouslySetInnerHTML={formatMessageContent(message.content)}
          style={{
            minHeight: isStreaming ? '16px' : 'auto',
          }}
        />
        
        {/* 时间戳：极简展示 */}
        <div style={{
          fontSize: 11,
          color: isUser ? 'rgba(255,255,255,0.7)' : COLORS.grayText,
          marginTop: 4,
          textAlign: 'right',
        }}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;