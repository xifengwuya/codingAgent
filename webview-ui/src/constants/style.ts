export const COLORS = {
  // 基础色
  white: '#FFFFFF',
  black: '#1D2129',
  // 主色
  primary: '#4080FF',
  primaryHover: '#3370E6',
  primaryLight: '#E8F3FF',
  // 辅助色
  grayBorder: '#E5E6EB',
  grayLight: '#F5F7FA',
  grayText: '#86909C',
  grayPlaceholder: '#C9CDD4',
  textPrimary: '#1D2129',
};

export const SIZES = {
  padding: 16,
  borderRadius: 8,
  inputHeight: 44,
  buttonHeight: 44,
};

export const ANIMATIONS = {
  fadeIn: 'fadeIn 0.3s ease-in-out',
  loading: 'loading 1.5s infinite',
};

export const KEYFRAMES = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;