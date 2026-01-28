import { Message } from '../globalTypes';
import { COLORS, SIZES } from '../constants/style';

// 扩展Props类型，新增fontSize配置
interface MessageItemProps {
  message: Message;
  formatTime: (timestamp: number) => string;
  isStreaming: boolean;
  msgMaxWidth: string;
  isSmallPanel: boolean;
  // 新增：字体大小配置（修复类型错误）
  fontSize?: {
    normal: string;
    small: string;
  };
  isError?: boolean;
}

const MessageItem = ({
  message,
  formatTime,
  isStreaming,
  msgMaxWidth,
  isSmallPanel,
  // 设置默认值，确保兼容性
  fontSize = {
    normal: '14px',
    small: '12px'
  },
  isError = false
}: MessageItemProps) => {
  // 核心修复1：直接过滤所有loading消息（无论内容是否为空）
  if (message.id.startsWith('loading_')) {
    return null;
  }
  
  // 核心修改：内容为空则不渲染该气泡
  if (!message.content || message.content.trim() === '') {
    return null;
  }
  
  const isUser = message.role === 'user';
  
  // 格式化消息内容（优化：处理代码块前后空格，修复XSS风险）
  const formatMessageContent = (content: string) => {
    // 转义HTML特殊字符，防止XSS
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // 处理代码块，保留格式并转义内容
    return {
      __html: escapeHtml(content).replace(
        /```([\s\S]*?)```/g,
        (_, code) => `<div class="code-block">${code}</div>`
      )
    };
  };

  return (
    <div 
      className="message-item-container"
      style={{
        display: 'flex',
        alignItems: 'flex-start', // 顶部对齐，避免头像错位
        marginBottom: isSmallPanel ? '8px' : `${SIZES.padding}px`,
        marginLeft: isUser ? 'auto' : '0',
        maxWidth: msgMaxWidth,
        width: '100%', // 改为100%，确保容器占满可用宽度
        boxSizing: 'border-box',
        padding: isSmallPanel ? '2px 0' : '0',
      }}
    >
      {/* 头像容器（优化：位置适配） */}
      <div style={{
        width: isSmallPanel ? 24 : 32,
        height: isSmallPanel ? 24 : 32,
        borderRadius: '50%',
        backgroundColor: isUser ? COLORS.primary : isError ? '#ff4d4f' : COLORS.grayLight,
        color: isUser ? COLORS.white : isError ? COLORS.white : COLORS.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isUser ? 0 : (isSmallPanel ? 6 : 10),
        marginLeft: isUser ? (isSmallPanel ? 6 : 10) : 0,
        flexShrink: 0, // 关键：防止头像被压缩
        fontSize: isSmallPanel ? fontSize.small : fontSize.normal,
        fontWeight: 500,
      }}>
        {isUser ? '你' : isError ? '❗' : 'AI'}
      </div>
      
      {/* 消息气泡（核心优化：宽度适配+样式增强） */}
      <div 
        className="message-bubble"
        style={{
          background: isUser ? COLORS.primary : isError ? 'rgba(255, 77, 79, 0.08)' : COLORS.white,
          color: isUser ? COLORS.white : isError ? '#ff4d4f' : COLORS.black,
          borderRadius: isUser 
            ? '16px 16px 4px 16px' // 用户消息气泡圆角优化
            : '16px 16px 16px 4px', // AI消息气泡圆角优化
          padding: isSmallPanel ? '8px 10px' : `${SIZES.padding - 2}px ${SIZES.padding}px`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'relative',
          fontSize: fontSize.normal,
          lineHeight: 1.6,
          width: 'calc(100% - 40px)', // 减去头像宽度，确保不溢出
          maxWidth: '100%',
          wordBreak: 'break-word', // 强制长文本换行
          whiteSpace: 'pre-wrap', // 保留换行符但允许自动换行
          boxSizing: 'border-box',
          minHeight: '24px', // 确保空内容也有基础高度
        }}
      >
        {/* 流式加载动画：仅当非错误、非用户消息且流式加载时显示 */}
        {isStreaming && !isUser && !isError && (
          <div className="loading-shimmer" style={{
            margin: '2px 0',
            width: isSmallPanel ? '30px' : '40px'
          }}></div>
        )}
        
        {/* 消息内容：始终渲染（已提前过滤空内容/loading消息） */}
        <div 
          dangerouslySetInnerHTML={formatMessageContent(message.content)}
          style={{
            minHeight: isStreaming ? '16px' : 'auto',
          }}
        />
        
        {/* 时间戳（优化：更小的字体，更靠右） */}
        <div style={{
          fontSize: fontSize.small,
          color: isUser 
            ? 'rgba(255,255,255,0.6)' 
            : isError 
              ? 'rgba(255, 77, 79, 0.7)' 
              : COLORS.grayText,
          marginTop: 4,
          textAlign: 'right',
          lineHeight: 1,
        }}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;