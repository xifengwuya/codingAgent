import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../globalTypes';
import { createVscodeApi, useVscodeMessageListener } from '../../utils/vscodeApi';
import MessageItem from '../MessageItem';
import { COLORS, SIZES, ANIMATIONS, KEYFRAMES } from '../../constants/style';

const ChatPanel = () => {
  const { initConfig, postVscodeMessage } = createVscodeApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClearBtnHover, setIsClearBtnHover] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSendBtnHover, setIsSendBtnHover] = useState(false);
  
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
      
      case 'message-response':
        setIsSending(false);
        if (message.data && typeof message.data === 'object' && 'id' in message.data) {
          const aiMessage = message.data as Message;
          setMessages(prev => prev.map(msg => 
            msg.id.startsWith('loading_') ? aiMessage : msg
          ));
        }
        break;
      
      case 'messages-cleared':
        setMessages([]);
        break;
      
      default:
        console.warn('未处理的消息类型：', message.type);
    }
  });

  // 初始化 + 输入框聚焦
  useEffect(() => {
    postVscodeMessage('request-config');
    if (inputRef.current) inputRef.current.focus();
  }, [postVscodeMessage]);

  // 消息自动滚动
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息
  const handleSend = () => {
    if (!trimmedContent || isSending) return;

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
    postVscodeMessage('send-message', {
      content: trimmedContent,
      provider: initConfig.provider
    });

    setInputValue('');
  };

  // 清空消息
  const handleClear = () => {
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
      {/* 注入动画 keyframes */}
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
              当前服务商：{initConfig.provider}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              formatTime={formatTime} 
            />
          ))
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
              handleSend();
            }
          }}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          placeholder={`输入问题后按回车发送（当前：${initConfig.provider}）`}
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
          onClick={handleSend} 
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