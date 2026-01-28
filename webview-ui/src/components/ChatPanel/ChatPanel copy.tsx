import { Message } from '../../globalTypes';
import { createVscodeApi, useVscodeMessageListener } from '../../utils/vscodeApi';
import MessageItem from '../MessageItem';
import { COLORS, SIZES, ANIMATIONS, KEYFRAMES } from '../../constants/style';
import { useState, useEffect, useRef, useCallback } from 'react';

// 响应式配置类型
interface ResponsiveConfig {
  isSmallPanel: boolean;
  msgMaxWidth: string;
  padding: number;
  msgContainerHeightRatio: number;
  inputHeight: number;
  buttonPadding: string;
  fontSize: {
    normal: string;
    small: string;
  };
}

const ChatPanel = () => {
  // ===== 1. 状态管理 =====
  const { initConfig, postVscodeMessage } = createVscodeApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [configRequested, setConfigRequested] = useState(false);
  // 响应式状态（优化：细化尺寸配置）
  const [responsiveConfig, setResponsiveConfig] = useState<ResponsiveConfig>({
    isSmallPanel: false,
    msgMaxWidth: '85%',
    padding: SIZES.padding,
    msgContainerHeightRatio: 0.8,
    inputHeight: 42,
    buttonPadding: '0 16px',
    fontSize: {
      normal: '14px',
      small: '12px'
    }
  });

  // ===== 2. 引用管理 =====
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stablePostMessage = useRef(postVscodeMessage);

  // ===== 3. 计算属性 =====
  const trimmedContent = inputValue.trim();
  const currentProvider = initConfig?.provider || '未获取';

  // ===== 统一错误提示方法 =====
  const showErrorAlert = useCallback((message: string) => {
    setIsSending(false);
    alert(`❌ AI调用失败：\n${message}`);
    const errorMsg: Message = {
      id: `error_${Date.now()}`,
      content: `❌ 调用失败：${message}`,
      role: 'assistant',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, errorMsg]);
  }, []);

  // ===== 4. 响应式适配逻辑（核心优化）=====
  const calculateResponsiveConfig = useCallback((panelWidth: number, panelHeight: number) => {
    const isSmallPanel = panelWidth < 400;
    const isExtraSmall = panelWidth < 300;
    const isMediumPanel = panelWidth >= 400 && panelWidth < 600;

    return {
      isSmallPanel: isSmallPanel,
      // 消息气泡宽度：超小面板几乎占满，避免横向滚动
      msgMaxWidth: isExtraSmall ? '99%' : isSmallPanel ? '98%' : isMediumPanel ? '90%' : '80%',
      // 内边距：根据面板宽度阶梯式调整
      padding: isExtraSmall ? 4 : isSmallPanel ? 8 : SIZES.padding,
      // 消息容器高度：根据面板高度动态调整，预留足够空间给输入区
      msgContainerHeightRatio: panelHeight < 400 ? 0.7 : panelHeight < 600 ? 0.75 : 0.85,
      // 输入框高度：适配小面板
      inputHeight: isExtraSmall ? 28 : isSmallPanel ? 32 : 42,
      // 按钮内边距：超小面板最小化内边距
      buttonPadding: isExtraSmall ? '0 8px' : isSmallPanel ? '0 10px' : '0 16px',
      // 字体大小：分级适配
      fontSize: {
        normal: isExtraSmall ? '11px' : isSmallPanel ? '12px' : '14px',
        small: isExtraSmall ? '10px' : isSmallPanel ? '11px' : '12px'
      }
    };
  }, []);

  // 监听面板尺寸变化（优化：使用ResizeObserver替代窗口监听，更精准）
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    
    const handleResize = () => {
      if (panelRef.current) {
        const panelWidth = panelRef.current.clientWidth;
        const panelHeight = panelRef.current.clientHeight;
        setResponsiveConfig(calculateResponsiveConfig(panelWidth, panelHeight));
      }
    };

    // 初始计算
    handleResize();

    // 使用ResizeObserver监听面板自身尺寸变化（而非全局窗口）
    if (panelRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(panelRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [calculateResponsiveConfig]);

  // ===== 5. 消息监听逻辑 =====
  useVscodeMessageListener((message) => {
    console.log('前端收到扩展端消息：', message.type);
    
    if (message.type === 'ai-service-error') {
      showErrorAlert(message.data.message);
      return;
    }

    const messageHandlers = {
      'config-data': () => console.log('配置更新：', message.data),
      'message-stream': () => handleStreamMessage(message),
      'message-response': () => handleNormalMessage(message),
      'messages-cleared': () => setMessages([]),
      'default': () => console.warn('未处理的消息类型：', message.type),
    };

    (messageHandlers[message.type as keyof typeof messageHandlers] || messageHandlers.default)();
  });

  // ===== 6. 核心方法 =====
  const handleStreamMessage = useCallback((message: any) => {
    const aiMsg = message.data as (Message & { isDone: boolean });
    
    setMessages(prev => {
      // 替换loading消息
      const hasLoading = prev.some(msg => msg.id.startsWith('loading_'));
      if (hasLoading && !prev.some(msg => msg.id === aiMsg.id)) {
        return prev.map(msg => 
          msg.id.startsWith('loading_') ? { ...aiMsg, timestamp: msg.timestamp } : msg
        );
      }
      // 更新已有消息
      return prev.map(msg => 
        msg.id === aiMsg.id ? { ...msg, content: aiMsg.content, isDone: aiMsg.isDone } : msg
      );
    });
    
    if (aiMsg.isDone) setIsSending(false);
  }, []);

  const handleNormalMessage = useCallback((message: any) => {
    setIsSending(false);
    if (message.data && typeof message.data === 'object' && 'id' in message.data) {
      const aiMessage = message.data as Message;
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('loading_') ? aiMessage : msg
      ));
    }
  }, []);

  // 初始化配置请求
  useEffect(() => {
    stablePostMessage.current = postVscodeMessage;
    
    if (!configRequested) {
      postVscodeMessage('request-config');
      setConfigRequested(true);
    }
    
    if (inputRef.current) inputRef.current.focus();
  }, [configRequested, postVscodeMessage]);

  // 消息自动滚动
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(() => {
    if (!trimmedContent) {
      showErrorAlert('请输入要发送的问题内容');
      return;
    }
    if (isSending) {
      showErrorAlert('当前正在发送请求，请稍候');
      return;
    }

    if (!initConfig || !initConfig.provider) {
      const errorMsg = !initConfig ? '未获取到扩展端初始化配置' : '初始化配置中无AI服务商';
      showErrorAlert(`${errorMsg}，请检查扩展设置后重试`);
      return;
    }

    try {
      setIsSending(true);
      
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        content: trimmedContent,
        role: 'user',
        timestamp: Date.now()
      };
      const loadingMsg: Message = {
        id: `loading_${Date.now()}`,
        content: '正在思考...',
        role: 'assistant',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, userMsg, loadingMsg]);
      
      stablePostMessage.current('send-message', {
        content: trimmedContent,
        provider: initConfig.provider
      });

      setInputValue('');
    } catch (error) {
      console.error('前端发送消息异常：', error);
      showErrorAlert((error as Error).message || '发送失败，请查看控制台日志');
    }
  }, [trimmedContent, isSending, initConfig, showErrorAlert]);

  // 清空消息
  const handleClear = useCallback(() => {
    stablePostMessage.current('clear-messages');
    setMessages([]);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 格式化时间
  const formatTime = useCallback((timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, []);

  // ===== 7. 渲染逻辑（核心优化）=====
  return (
    <div 
      ref={panelRef}
      style={{
        padding: `${responsiveConfig.padding}px`,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: COLORS.white,
        overflow: 'hidden', // 防止面板整体溢出
        display: 'flex',
        flexDirection: 'column' // 垂直布局，确保输入区始终在底部
      }}
    >
      {/* 全局样式 */}
      <style>{`
        ${KEYFRAMES}
        /* 滚动条美化 */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: ${COLORS.grayBorder};
          border-radius: 3px;
        }
        /* 代码块样式（核心优化：防止横向滚动） */
        .code-block {
          background: ${COLORS.grayLight};
          border-radius: ${SIZES.borderRadius}px;
          padding: 12px;
          font-family: monospace;
          font-size: ${responsiveConfig.fontSize.small};
          line-height: 1.6;
          overflow-x: auto;
          margin: 8px 0;
          white-space: pre-wrap; /* 关键：允许代码换行 */
          word-break: break-all; /* 强制长代码换行 */
          width: 100%;
          box-sizing: border-box;
        }
        /* 流式加载动画 */
        .loading-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: spin 1.5s infinite;
          height: 16px;
          width: 40px;
          display: inline-block;
        }
        /* 按钮hover样式 */
        .clear-btn:hover {
          background-color: ${COLORS.grayLight};
          color: ${COLORS.black};
        }
        /* 输入框focus样式 */
        .chat-input:focus {
          border-color: ${COLORS.primary};
          box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.1);
        }
        /* 发送按钮hover样式 */
        .send-btn:not(:disabled):hover {
          background-color: ${COLORS.primaryHover};
        }
        /* 输入框disabled样式 */
        .chat-input:disabled {
          background-color: ${COLORS.grayLight};
          cursor: not-allowed;
        }
        /* 错误消息样式 */
        .error-message {
          color: #ff4d4f;
          background-color: rgba(255, 77, 79, 0.05);
          padding: 8px 12px;
          border-radius: 8px;
          margin: 4px 0;
          word-break: break-word; /* 错误消息换行 */
        }
        /* 消息气泡基础样式（防止横向滚动） */
        .message-bubble {
          max-width: ${responsiveConfig.msgMaxWidth};
          word-break: break-word; /* 长文本换行 */
          white-space: pre-wrap; /* 保留换行符但允许换行 */
          box-sizing: border-box;
        }
      `}</style>

      {/* 顶部栏（优化：弹性布局，防止截断） */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: `${responsiveConfig.padding}px`,
        width: '100%',
        flexShrink: 0, // 防止被压缩
        gap: 8 // 增加间距，防止内容重叠
      }}>
        <div style={{
          fontSize: responsiveConfig.isSmallPanel ? 14 : 18,
          fontWeight: 600,
          color: COLORS.black,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis' // 超长标题省略
        }}>
          🤖 AI 编程助手
        </div>
        <button 
          onClick={handleClear}
          className="clear-btn"
          style={{
            padding: '4px 10px',
            cursor: 'pointer',
            border: `1px solid ${COLORS.grayBorder}`,
            borderRadius: SIZES.borderRadius,
            backgroundColor: COLORS.white,
            color: COLORS.grayText,
            fontSize: responsiveConfig.fontSize.small,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            flexShrink: 0 // 防止按钮被压缩
          }}
        >
          清空消息
        </button>
      </div>
      
      {/* 消息容器（核心优化：使用flex布局，高度计算更可靠） */}
      <div 
        ref={messageContainerRef}
        style={{
          flex: 1, // 自动填充剩余空间
          border: `1px solid ${COLORS.grayBorder}`,
          padding: `${responsiveConfig.padding}px`,
          marginBottom: `${responsiveConfig.padding}px`,
          overflowY: 'auto',
          overflowX: 'hidden', // 强制隐藏横向滚动
          boxSizing: 'border-box',
          borderRadius: SIZES.borderRadius,
          backgroundColor: COLORS.white,
          scrollBehavior: 'smooth',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          width: '100%'
        }}
      >
        {messages.length === 0 ? (
          // 空状态（核心优化：确保居中显示）
          <div style={{
            color: COLORS.grayPlaceholder,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%', // 高度100%确保垂直居中
            width: '100%', // 宽度100%确保水平居中
            padding: '20px',
            boxSizing: 'border-box',
            animation: ANIMATIONS.fadeIn,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: responsiveConfig.isSmallPanel ? 20 : 36,
              marginBottom: 10,
              color: COLORS.primaryLight || COLORS.primary,
            }}>
              🤖
            </div>
            <div style={{ 
              fontSize: responsiveConfig.fontSize.normal, 
              marginBottom: 4,
              color: COLORS.black
            }}>
              请输入你的编程问题
            </div>
            <div style={{ 
              fontSize: responsiveConfig.fontSize.small, 
              color: COLORS.grayText,
              lineHeight: 1.4,
              maxWidth: '90%' // 防止文本超出容器
            }}>
              当前服务商：{currentProvider} <br/>
              支持代码解释/功能实现/Bug修复
            </div>
          </div>
        ) : (
          // 消息列表
          messages.map(msg => {
            const isStreaming = msg.role === 'assistant' && !msg.id.startsWith('loading_') && 
                              !((msg as any).isDone ?? true);
            const isError = msg.content.startsWith('❌ 调用失败：');
            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                formatTime={formatTime} 
                isStreaming={isStreaming}
                msgMaxWidth={responsiveConfig.msgMaxWidth}
                isSmallPanel={responsiveConfig.isSmallPanel}
                fontSize={responsiveConfig.fontSize} // 传递字体大小配置
              />
            );
          })
        )}
      </div>

      {/* 输入区域（核心优化：确保始终完整显示） */}
      <div style={{
        display: 'flex',
        gap: responsiveConfig.isSmallPanel ? 4 : 8,
        alignItems: 'center',
        boxSizing: 'border-box',
        width: '100%',
        flexShrink: 0, // 防止输入区被压缩
        paddingTop: 4 // 增加顶部间距
      }}>
        <input 
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`输入问题后按回车发送（当前：${currentProvider}）`}
          className="chat-input"
          style={{
            flex: 1, // 占满剩余空间
            height: responsiveConfig.inputHeight,
            padding: `0 ${responsiveConfig.padding + 2}px`,
            border: `1px solid ${COLORS.grayBorder}`,
            borderRadius: SIZES.borderRadius,
            outline: 'none',
            fontSize: responsiveConfig.fontSize.normal,
            color: COLORS.black,
            backgroundColor: COLORS.white,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            minWidth: 0, // 关键：允许输入框收缩
            boxSizing: 'border-box'
          }}
          disabled={isSending}
        />
        <button 
          onClick={handleSend}
          disabled={!trimmedContent || isSending}
          className="send-btn"
          style={{
            height: responsiveConfig.inputHeight,
            padding: responsiveConfig.buttonPadding,
            backgroundColor: (!trimmedContent || isSending) 
              ? COLORS.grayLight 
              : COLORS.primary,
            color: COLORS.white,
            border: 'none',
            borderRadius: SIZES.borderRadius,
            cursor: (!trimmedContent || isSending) ? 'not-allowed' : 'pointer',
            fontSize: responsiveConfig.fontSize.normal,
            fontWeight: 500,
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap',
            flexShrink: 0, // 防止按钮被压缩
            minWidth: responsiveConfig.isSmallPanel ? 40 : 60 // 最小宽度保障
          }}
        >
          {isSending ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;