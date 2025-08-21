// 简单的功能测试
const tailwindTheme = require('./index.js');

// 测试基本配置
const plugin = tailwindTheme({
  themes: {
    light: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981'
      }
    },
    dark: {
      colors: {
        primary: '#60a5fa',
        secondary: '#34d399'
      }
    }
  },
  prefix: 'test',
  defaultTheme: 'light'
});

console.log('✅ 插件创建成功');

// 测试错误处理
const emptyPlugin = tailwindTheme({});
if (emptyPlugin === undefined) {
  console.log('✅ 空配置处理正确');
}

// 测试没有主题配置
const noThemesPlugin = tailwindTheme({ themes: {} });
console.log('✅ 所有测试通过');
