import React, { useState, useEffect } from 'react';
// 🌟 导入.ts类型文件
import { Message } from '../../globalTypes';
import { createVscodeApi, useVscodeMessageListener } from '../../utils/vscodeApi';

const ChatPanel = () => {
  const { initConfig, postVscodeMessage } = createVscodeApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const trimmedContent = inputValue.trim();

  useVscodeMessageListener((message) => {
    console.log('前端收到扩展端消息：', message.type);
    
    switch (message.type) {
      case 'config-data':
        console.log('配置更新：', message.data);
        break;
      
      case 'message-response':
        if (
          message.data && 
          typeof message.data === 'object' && 
          'id' in message.data &&
          'content' in message.data &&
          'role' in message.data
        ) {
          const aiMessage = message.data as Message;
          setMessages(prev => 
            prev.map(msg => 
              msg.id.startsWith('loading_') ? aiMessage : msg
            )
          );
        }
        break;
      
      case 'messages-cleared':
        setMessages([]);
        break;
      
      default:
        console.warn('未处理的消息类型：', message.type);
    }
  });

  useEffect(() => {
    postVscodeMessage('request-config');
  }, [postVscodeMessage]);

  const handleSend = () => {
    if (!trimmedContent) return;

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

  const handleClear = () => {
    postVscodeMessage('clear-messages');
    setMessages([]);
  };

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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', height: '100%', boxSizing: 'border-box' }}>
      <button 
        onClick={handleClear}
        style={{ marginBottom: '10px', padding: '4px 8px', cursor: 'pointer' }}
      >
        清空消息
      </button>
      
      <div 
        style={{ 
          height: 'calc(100vh - 120px)', 
          border: '1px solid #eee', 
          padding: '10px', 
          marginBottom: '10px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
            请输入问题，开始与AI对话
            <div style={{ marginTop: 8, fontSize: 12 }}>当前服务商：{initConfig.provider}</div>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id}
              style={{ 
                margin: '8px 0', 
                padding: '8px 12px',
                backgroundColor: msg.role === 'user' ? '#e6f7ff' : '#f5f5f5',
                borderRadius: '6px',
                maxWidth: '80%',
                marginLeft: msg.role === 'user' ? 'auto' : 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ 
                fontWeight: '600', 
                fontSize: 14,
                marginBottom: 4
              }}>
                {msg.role === 'user' ? '你' : 'AI'}
                <span style={{ 
                  fontWeight: 'normal', 
                  color: '#999', 
                  marginLeft: '8px',
                  fontSize: 12
                }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div style={{ 
                marginTop: '4px', 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: 14
              }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', boxSizing: 'border-box' }}>
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`输入问题后按回车发送（当前：${initConfig.provider}）`}
          style={{ 
            flex: 1, 
            padding: '10px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px',
            outline: 'none',
            fontSize: 14
          }}
          autoFocus
        />
        <button 
          onClick={handleSend} 
          disabled={!trimmedContent}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: !trimmedContent ? '#ccc' : '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !trimmedContent ? 'not-allowed' : 'pointer',
            fontSize: 14
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;