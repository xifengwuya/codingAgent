// 样式常量，统一管理配色、尺寸、动画，便于扩展和维护
export const COLORS = {
  primary: '#0078d4', // 主色（VS Code 蓝）
  primaryLight: '#e6f7ff', // 主色浅版（用户消息背景）
   primaryHover: '#005a9e', // 主色 hover 态（新增这一行！）
  grayLight: '#f5f5f5', // 浅灰（AI 消息背景）
  grayBorder: '#e0e0e0', // 边框灰
  grayText: '#666666', // 次要文本色
  grayPlaceholder: '#999999', // 占位符色
  white: '#ffffff', // 白色
  black: '#333333', // 主要文本色
};

export const SIZES = {
  padding: 16, // 基础内边距
  borderRadius: 8, // 基础圆角
  messageMaxWidth: '85%', // 消息最大宽度
  inputHeight: 40, // 输入框高度
  buttonHeight: 40, // 按钮高度
};

export const ANIMATIONS = {
  fadeIn: 'fadeIn 0.3s ease-in-out',
  spin: 'spin 1s linear infinite',
  slideUp: 'slideUp 0.2s ease-out',
};

// 动画 keyframes
export const KEYFRAMES = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;