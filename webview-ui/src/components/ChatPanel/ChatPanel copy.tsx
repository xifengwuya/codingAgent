import { Message } from '../../globalTypes';
import { createVscodeApi, useVscodeMessageListener } from '../../utils/vscodeApi';
import MessageItem from '../MessageItem';
import { COLORS, SIZES, ANIMATIONS, KEYFRAMES } from '../../constants/style';
import React, { useState, useEffect, useRef } from 'react';

// 移除全局变量声明（改用React状态，更可靠）

const ChatPanel = () => {
  const { initConfig, postVscodeMessage } = createVscodeApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClearBtnHover, setIsClearBtnHover] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSendBtnHover, setIsSendBtnHover] = useState(false);
  // 核心修复：用React状态标记是否已请求配置（替代全局变量）
  const [configRequested, setConfigRequested] = useState(false);
  
  const trimmedContent = inputValue.trim();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 监听扩展端消息
  useVscodeMessageListener((message) => {
    console.log('前端收到扩展端消息：', message.type);
    
    switch (message.type) {
      case 'config-data':
        console.log('配置更新：', message.data);
        break;
      
      case 'message-stream': {
        const aiMsg = message.data as (Message & { isDone: boolean });
        console.log('前端收到流式消息：', aiMsg.id, '是否完成：', aiMsg.isDone, '当前内容：', aiMsg.content.slice(0, 50) + '...');
        setMessages(prev => {
          const hasLoading = prev.some(msg => msg.id.startsWith('loading_'));
          if (hasLoading && !prev.some(msg => msg.id === aiMsg.id)) {
            return prev.map(msg => 
              msg.id.startsWith('loading_') ? { ...aiMsg, timestamp: msg.timestamp } : msg
            );
          }
          return prev.map(msg => msg.id === aiMsg.id ? { ...msg, content: aiMsg.content, isDone: aiMsg.isDone } : msg);
        });
        if (aiMsg.isDone) setIsSending(false);
        break;
      }

      case 'message-response':
        setIsSending(false);
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          const aiMessage = message.data as Message;
          console.log('前端收到普通消息响应：', aiMessage.id);
          setMessages(prev => prev.map(msg => 
            msg.id.startsWith('loading_') ? aiMessage : msg
          ));
        }
        break;
      
      case 'messages-cleared':
        console.log('前端收到清空消息指令');
        setMessages([]);
        break;
      
      default:
        console.warn('未处理的消息类型：', message.type);
    }
  });

  // 初始化 + 输入框聚焦 - 核心修复
  useEffect(() => {
    console.log('前端ChatPanel初始化，检查配置请求状态');
    
    // 仅在未请求过配置时发送请求
    if (!configRequested) {
      console.log('前端首次请求扩展端配置');
      postVscodeMessage('request-config');
      setConfigRequested(true); // 标记为已请求（React状态，会持久化）
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
      console.log('前端输入框已自动聚焦');
    }
    // 打印初始配置，确认是否正确注入
    console.log('前端初始化配置：', initConfig);
    
    // 核心修复：依赖项只保留必要的（移除postVscodeMessage，避免其引用变化导致重复执行）
    // 注：如果postVscodeMessage是每次渲染都新建的函数，会导致useEffect重复触发
  }, [configRequested]); // 仅依赖configRequested，确保只执行一次

  // 额外优化：如果postVscodeMessage是动态生成的，用useCallback包裹（可选）
  const stablePostMessage = useRef(postVscodeMessage);
  useEffect(() => {
    stablePostMessage.current = postVscodeMessage;
  }, [postVscodeMessage]);

  // 消息自动滚动
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息 - 核心修正：加全量日志 + 严格校验 + 异常捕获
  const handleSend = () => {
    // 日志1：触发发送，打印基础状态
    console.log('===== 前端发送逻辑触发 =====');
    console.log('输入框原始值：', inputValue);
    console.log('去除空格后值：', trimmedContent);
    console.log('是否正在发送：', isSending);
    console.log('发送按钮是否禁用：', !trimmedContent || isSending);

    // 核心校验1：内容为空或正在发送，直接终止并打印日志
    if (!trimmedContent) {
      console.warn('发送终止：消息内容为空（去除空格后无内容）');
      return;
    }
    if (isSending) {
      console.warn('发送终止：当前正在发送中，避免重复请求');
      return;
    }

    try {
      // 核心校验2：确认initConfig和provider是否存在
      if (!initConfig) {
        console.error('发送终止：未获取到扩展端初始化配置');
        alert('配置异常，请刷新面板后重试');
        return;
      }
      if (!initConfig.provider) {
        console.error('发送终止：初始化配置中无AI服务商provider');
        console.log('当前initConfig完整值：', initConfig);
        alert('服务商配置异常，请检查扩展设置');
        return;
      }

      // 标记为发送中
      setIsSending(true);
      console.log('已标记为发送中，开始构造用户消息和加载消息');

      // 构造用户消息
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        content: trimmedContent,
        role: 'user',
        timestamp: Date.now()
      };
      // 构造加载消息
      const loadingMsg: Message = {
        id: `loading_${Date.now()}`,
        content: '正在思考...',
        role: 'assistant',
        timestamp: Date.now()
      };
      console.log('构造用户消息：', userMsg);
      console.log('构造加载消息：', loadingMsg);

      // 更新消息列表，先展示用户消息和加载状态
      setMessages(prev => [...prev, userMsg, loadingMsg]);
      console.log('前端消息列表已更新，新增用户消息和加载消息');

      // 核心：向扩展端发送send-message消息，带详细日志
      console.log('开始向扩展端发送消息，参数：', {
        type: 'send-message',
        content: trimmedContent,
        provider: initConfig.provider
      });
      postVscodeMessage('send-message', {
        content: trimmedContent,
        provider: initConfig.provider
      });
      console.log('===== 前端发送逻辑执行完成 =====');

      // 清空输入框
      setInputValue('');
    } catch (error) {
      // 异常捕获：防止发送过程中报错导致界面卡死
      console.error('前端发送消息时发生未知错误：', error);
      setIsSending(false);
      alert('发送失败，请查看控制台日志');
    }
  };

  // 清空消息
  const handleClear = () => {
    console.log('前端触发清空消息，向扩展端发送指令');
    postVscodeMessage('clear-messages');
    setMessages([]);
    if (inputRef.current) inputRef.current.focus();
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div style={{
      padding: `${SIZES.padding}px`,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100%',
      boxSizing: 'border-box',
      backgroundColor: COLORS.white,
    }}>
      <style>{KEYFRAMES}</style>

      {/* 清空按钮 */}
      <button 
        onClick={handleClear}
        onMouseEnter={() => setIsClearBtnHover(true)}
        onMouseLeave={() => setIsClearBtnHover(false)}
        style={{
          marginBottom: `${SIZES.padding}px`,
          padding: '6px 12px',
          cursor: 'pointer',
          border: `1px solid ${COLORS.grayBorder}`,
          borderRadius: SIZES.borderRadius,
          backgroundColor: isClearBtnHover ? COLORS.grayLight : COLORS.white,
          color: isClearBtnHover ? COLORS.black : COLORS.grayText,
          fontSize: 12,
          transition: 'all 0.2s ease',
        }}
      >
        清空消息
      </button>
      
      {/* 消息容器 */}
      <div 
        ref={messageContainerRef}
        style={{
          height: 'calc(100vh - 140px)',
          border: `1px solid ${COLORS.grayBorder}`,
          padding: `${SIZES.padding}px`,
          marginBottom: `${SIZES.padding}px`,
          overflowY: 'auto',
          boxSizing: 'border-box',
          borderRadius: SIZES.borderRadius,
          backgroundColor: COLORS.white,
          scrollBehavior: 'smooth',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            color: COLORS.grayPlaceholder,
            textAlign: 'center',
            padding: '60px 20px',
            animation: ANIMATIONS.fadeIn,
          }}>
            <div style={{
              fontSize: 20,
              marginBottom: 16,
              color: COLORS.primary,
            }}>
              🤖 Coding Agent
            </div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              请输入编程问题，我会尽力解答
            </div>
            <div style={{ fontSize: 12, color: COLORS.grayText }}>
              当前服务商：{initConfig?.provider || '未获取'}
            </div>
          </div>
        ) : (
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

      {/* 输入框 + 发送按钮 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}>
        <input 
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              console.log('回车触发发送（非按住shift）');
              handleSend();
            }
          }}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          placeholder={`输入问题后按回车发送（当前：${initConfig?.provider || '未获取'}）`}
          style={{
            flex: 1,
            height: SIZES.inputHeight,
            padding: `0 ${SIZES.padding}px`,
            border: `1px solid ${isInputFocused ? COLORS.primary : COLORS.grayBorder}`,
            borderRadius: SIZES.borderRadius,
            outline: 'none',
            fontSize: 14,
            color: COLORS.black,
            backgroundColor: COLORS.white,
            boxShadow: isInputFocused ? `0 0 0 2px rgba(0, 120, 212, 0.1)` : 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          disabled={isSending}
        />
        <button 
          onClick={() => {
            console.log('发送按钮被点击');
            handleSend();
          }}
          onMouseEnter={() => setIsSendBtnHover(true)}
          onMouseLeave={() => setIsSendBtnHover(false)}
          disabled={!trimmedContent || isSending}
          style={{
            height: SIZES.buttonHeight,
            padding: `0 ${SIZES.padding * 1.5}px`,
            backgroundColor: (!trimmedContent || isSending) 
              ? COLORS.grayLight 
              : (isSendBtnHover ? COLORS.primaryHover : COLORS.primary),
            color: COLORS.white,
            border: 'none',
            borderRadius: SIZES.borderRadius,
            cursor: (!trimmedContent || isSending) ? 'not-allowed' : 'pointer',
            fontSize: 14,
            transition: 'background-color 0.2s ease',
          }}
        >
          {isSending ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;