import { Message } from '../../globalTypes';
import { createVscodeApi, useVscodeMessageListener } from '../../utils/vscodeApi';
import MessageItem from '../MessageItem';
import { COLORS, SIZES, ANIMATIONS, KEYFRAMES } from '../../constants/style';
import { useState, useEffect, useRef, useCallback } from 'react';

// 🔍 类型扩展：定义响应式配置类型（低耦合）
interface ResponsiveConfig {
  isSmallPanel: boolean;
  msgMaxWidth: string;
  padding: number;
}

const ChatPanel = () => {
  // ===== 1. 状态管理（核心逻辑解耦）=====
  const { initConfig, postVscodeMessage } = createVscodeApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [configRequested, setConfigRequested] = useState(false);
  // 响应式状态（独立管理）
  const [responsiveConfig, setResponsiveConfig] = useState<ResponsiveConfig>({
    isSmallPanel: false,
    msgMaxWidth: '85%',
    padding: SIZES.padding,
  });

  // ===== 2. 引用管理 =====
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stablePostMessage = useRef(postVscodeMessage);

  // ===== 3. 计算属性（解耦业务逻辑）=====
  const trimmedContent = inputValue.trim();
  const currentProvider = initConfig?.provider || '未获取';

  // ===== 4. 响应式适配逻辑（核心修复：适配面板尺寸）=====
  const calculateResponsiveConfig = useCallback((panelWidth: number) => {
    // 优化：缩小小面板判定阈值，适配VS Code窄面板
    const isSmallPanel = panelWidth < 500;
    return {
      isSmallPanel,
      msgMaxWidth: isSmallPanel ? '95%' : '80%', // 小面板消息宽度更大
      padding: isSmallPanel ? SIZES.padding - 6 : SIZES.padding, // 小面板减少内边距
    };
  }, []);

  // 监听面板尺寸变化，动态更新响应式配置（修复：确保DOM渲染后计算）
  useEffect(() => {
    const handleResize = () => {
      if (panelRef.current) {
        const panelWidth = panelRef.current.clientWidth;
        const panelHeight = panelRef.current.clientHeight;
        console.log('面板尺寸：', panelWidth, panelHeight); // 调试用
        setResponsiveConfig(calculateResponsiveConfig(panelWidth));
      }
    };

    // 修复：延迟计算，确保DOM完全渲染
    const resizeTimer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    
    // 清理监听（避免内存泄漏）
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateResponsiveConfig]);

  // ===== 5. 消息监听逻辑（解耦，易扩展新消息类型）=====
  useVscodeMessageListener((message) => {
    console.log('前端收到扩展端消息：', message.type);
    
    const messageHandlers = {
      'config-data': () => console.log('配置更新：', message.data),
      'message-stream': () => handleStreamMessage(message),
      'message-response': () => handleNormalMessage(message),
      'messages-cleared': () => setMessages([]),
      'default': () => console.warn('未处理的消息类型：', message.type),
    };

    (messageHandlers[message.type as keyof typeof messageHandlers] || messageHandlers.default)();
  });

  // ===== 6. 核心方法（独立封装，低耦合）=====
  // 处理流式消息
  const handleStreamMessage = useCallback((message: any) => {
    const aiMsg = message.data as (Message & { isDone: boolean });
    console.log('前端收到流式消息：', aiMsg.id, '是否完成：', aiMsg.isDone);
    
    setMessages(prev => {
      const hasLoading = prev.some(msg => msg.id.startsWith('loading_'));
      if (hasLoading && !prev.some(msg => msg.id === aiMsg.id)) {
        return prev.map(msg => 
          msg.id.startsWith('loading_') ? { ...aiMsg, timestamp: msg.timestamp } : msg
        );
      }
      return prev.map(msg => 
        msg.id === aiMsg.id ? { ...msg, content: aiMsg.content, isDone: aiMsg.isDone } : msg
      );
    });
    
    if (aiMsg.isDone) setIsSending(false);
  }, []);

  // 处理普通消息
  const handleNormalMessage = useCallback((message: any) => {
    setIsSending(false);
    if (message.data && typeof message.data === 'object' && 'id' in message.data) {
      const aiMessage = message.data as Message;
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('loading_') ? aiMessage : msg
      ));
    }
  }, []);

  // 初始化配置请求（解耦）
  useEffect(() => {
    stablePostMessage.current = postVscodeMessage;
    
    if (!configRequested) {
      console.log('前端首次请求扩展端配置');
      postVscodeMessage('request-config');
      setConfigRequested(true);
    }
    
    if (inputRef.current) inputRef.current.focus();
  }, [configRequested, postVscodeMessage]);

  // 消息自动滚动（独立逻辑）
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息（核心逻辑封装，易扩展）
  const handleSend = useCallback(() => {
    // 基础校验
    if (!trimmedContent) {
      console.warn('发送终止：消息内容为空');
      return;
    }
    if (isSending) {
      console.warn('发送终止：当前正在发送中');
      return;
    }

    // 配置校验
    if (!initConfig || !initConfig.provider) {
      const errorMsg = !initConfig ? '未获取到扩展端初始化配置' : '初始化配置中无AI服务商';
      console.error(`发送终止：${errorMsg}`);
      alert(`${errorMsg}，请检查扩展设置后重试`);
      return;
    }

    try {
      setIsSending(true);
      
      // 构造消息（可扩展消息类型）
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

      // 更新消息列表
      setMessages(prev => [...prev, userMsg, loadingMsg]);
      
      // 发送消息到扩展端
      stablePostMessage.current('send-message', {
        content: trimmedContent,
        provider: initConfig.provider
      });

      // 清空输入框
      setInputValue('');
    } catch (error) {
      console.error('前端发送消息异常：', error);
      setIsSending(false);
      alert('发送失败，请查看控制台日志');
    }
  }, [trimmedContent, isSending, initConfig]);

  // 清空消息（独立方法，易扩展）
  const handleClear = useCallback(() => {
    stablePostMessage.current('clear-messages');
    setMessages([]);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // 格式化时间（工具方法解耦）
  const formatTime = useCallback((timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, []);

  // ===== 7. 渲染逻辑（核心修复：响应式适配）=====
  return (
    <div 
      ref={panelRef}
      style={{
        padding: `${responsiveConfig.padding}px`,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        height: '100%',
        minHeight: '100vh', // 修复：确保最小高度，避免内容截断
        boxSizing: 'border-box',
        backgroundColor: COLORS.white,
        overflow: 'hidden', // 修复：隐藏溢出内容
      }}
    >
      {/* 全局样式：滚动条美化 + 动画 + 代码块样式 */}
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
        /* 代码块样式 */
        .code-block {
          background: ${COLORS.grayLight};
          border-radius: ${SIZES.borderRadius}px;
          padding: 12px;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          margin: 8px 0;
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
      `}</style>

      {/* 顶部栏：标题 + 清空按钮（响应式） */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: `${responsiveConfig.padding}px`,
        width: '100%', // 修复：确保填满宽度
      }}>
        <div style={{
          fontSize: responsiveConfig.isSmallPanel ? 14 : 18, // 小面板缩小标题
          fontWeight: 600,
          color: COLORS.black,
          whiteSpace: 'nowrap', // 修复：标题不换行
        }}>
          🤖 AI 编程助手
        </div>
        <button 
          onClick={handleClear}
          className="clear-btn"
          style={{
            padding: '4px 10px', // 修复：缩小按钮内边距
            cursor: 'pointer',
            border: `1px solid ${COLORS.grayBorder}`,
            borderRadius: SIZES.borderRadius,
            backgroundColor: COLORS.white,
            color: COLORS.grayText,
            fontSize: responsiveConfig.isSmallPanel ? 10 : 12, // 小面板缩小字体
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap', // 修复：按钮文字不换行
          }}
        >
          清空消息
        </button>
      </div>
      
      {/* 消息容器（核心修复：适配高度） */}
      <div 
        ref={messageContainerRef}
        style={{
          // 修复：基于视口高度计算，适配不同面板大小
          height: `calc(100vh - ${responsiveConfig.isSmallPanel ? 100 : 130}px)`,
          maxHeight: `calc(100vh - ${responsiveConfig.isSmallPanel ? 100 : 130}px)`, // 修复：限制最大高度
          border: `1px solid ${COLORS.grayBorder}`,
          padding: `${responsiveConfig.padding}px`,
          marginBottom: `${responsiveConfig.padding}px`,
          overflowY: 'auto', // 修复：确保内容可滚动
          overflowX: 'hidden', // 修复：隐藏横向溢出
          boxSizing: 'border-box',
          borderRadius: SIZES.borderRadius,
          backgroundColor: COLORS.white,
          scrollBehavior: 'smooth',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {messages.length === 0 ? (
          // 空状态：适配小面板
          <div style={{
            color: COLORS.grayPlaceholder,
            textAlign: 'center',
            padding: responsiveConfig.isSmallPanel ? '40px 10px' : '80px 20px', // 小面板减少内边距
            animation: ANIMATIONS.fadeIn,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%', // 修复：填满容器高度
            justifyContent: 'center', // 修复：垂直居中
          }}>
            <div style={{
              fontSize: responsiveConfig.isSmallPanel ? 24 : 40, // 小面板缩小图标
              marginBottom: 12, // 小面板减少间距
              color: COLORS.primaryLight || COLORS.primary,
            }}>
              🤖
            </div>
            <div style={{ 
              fontSize: responsiveConfig.isSmallPanel ? 12 : 16, 
              marginBottom: 6,
              color: COLORS.black
            }}>
              请输入你的编程问题
            </div>
            <div style={{ 
              fontSize: responsiveConfig.isSmallPanel ? 10 : 14, 
              color: COLORS.grayText,
              textAlign: 'center', // 修复：文字居中
              lineHeight: 1.4, // 修复：行高适配
            }}>
              当前服务商：{currentProvider} <br/>
              支持代码解释/功能实现/Bug修复
            </div>
          </div>
        ) : (
          // 消息列表：响应式气泡布局
          messages.map(msg => {
            const isStreaming = msg.role === 'assistant' && !msg.id.startsWith('loading_') && 
                              !((msg as any).isDone ?? true);
            return (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                formatTime={formatTime} 
                isStreaming={isStreaming}
              />
            );
          })
        )}
      </div>

      {/* 输入区域：核心修复：适配宽度和尺寸 */}
      <div style={{
        display: 'flex',
        gap: responsiveConfig.isSmallPanel ? 4 : 8, // 小面板减少间距
        alignItems: 'center',
        boxSizing: 'border-box',
        width: '100%', // 修复：确保填满宽度
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
            flex: 1, // 修复：占满剩余宽度
            height: responsiveConfig.isSmallPanel ? 32 : 44, // 小面板缩小高度
            padding: `0 ${responsiveConfig.padding}px`,
            border: `1px solid ${COLORS.grayBorder}`,
            borderRadius: SIZES.borderRadius,
            outline: 'none',
            fontSize: responsiveConfig.isSmallPanel ? 11 : 14, // 小面板缩小字体
            color: COLORS.black,
            backgroundColor: COLORS.white,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            minWidth: '80px', // 修复：输入框最小宽度
          }}
          disabled={isSending}
        />
        <button 
          onClick={handleSend}
          disabled={!trimmedContent || isSending}
          className="send-btn"
          style={{
            height: responsiveConfig.isSmallPanel ? 32 : 44, // 小面板缩小高度
            padding: `0 ${responsiveConfig.padding}px`, // 小面板减少内边距
            backgroundColor: (!trimmedContent || isSending) 
              ? COLORS.grayLight 
              : COLORS.primary,
            color: COLORS.white,
            border: 'none',
            borderRadius: SIZES.borderRadius,
            cursor: (!trimmedContent || isSending) ? 'not-allowed' : 'pointer',
            fontSize: responsiveConfig.isSmallPanel ? 11 : 14, // 小面板缩小字体
            fontWeight: 500,
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap', // 修复：按钮文字不换行
            minWidth: '60px', // 修复：按钮最小宽度
          }}
        >
          {isSending ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;