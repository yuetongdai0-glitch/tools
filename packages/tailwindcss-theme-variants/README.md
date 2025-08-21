# tailwind-theme-variants

一个支持主题变体和CSS自定义属性的Tailwind CSS插件。

## 特性

- 🎨 支持多主题切换
- 🌙 内置暗色/亮色模式支持
- 🎯 CSS自定义属性（CSS Variables）
- 🔧 可配置的变量前缀
- 📦 零依赖（除了Tailwind CSS）
- 🚀 TypeScript支持

## 安装

```bash
npm install tailwind-theme-variants
```

或者使用 yarn:

```bash
yarn add tailwind-theme-variants
```

## 使用方法

### 1. 在 tailwind.config.js 中配置插件

```javascript
const tailwindTheme = require('tailwind-theme-variants');

module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    tailwindTheme({
      themes: {
        light: {
          colors: {
            primary: '#3b82f6',
            secondary: '#10b981',
            background: '#ffffff',
            text: '#1f2937'
          }
        },
        dark: {
          colors: {
            primary: '#60a5fa',
            secondary: '#34d399',
            background: '#111827',
            text: '#f9fafb'
          }
        }
      },
      prefix: 'theme', // 可选，默认为 'p'
      defaultTheme: 'light' // 可选，将该主题的颜色设置到 :root 选择器
    })
  ],
}
```

### 2. 在 HTML 中使用主题类

```html
<!-- 应用亮色主题 -->
<div class="light bg-background text-text">
  <h1 class="text-primary">标题</h1>
  <p class="text-secondary">内容</p>
</div>

<!-- 应用暗色主题 -->
<div class="dark bg-background text-text">
  <h1 class="text-primary">标题</h1>
  <p class="text-secondary">内容</p>
</div>

<!-- 使用主题变体 -->
<div class="light:bg-primary dark:bg-secondary">
  响应式主题内容
</div>
```

### 3. 动态切换主题

```javascript
// 切换到暗色主题
document.body.className = 'dark';

// 切换到亮色主题
document.body.className = 'light';

// 或者使用 theme 后缀
document.body.className = 'dark-theme';
```

## API 参考

### 插件配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `themes` | `Record<string, ThemeConfig>` | `{}` | 主题配置对象，必需 |
| `prefix` | `string` | `'p'` | CSS 变量前缀 |
| `defaultTheme` | `string` | `null` | 默认主题名称，该主题的颜色将设置到 `:root` 选择器 |

### ThemeConfig

```typescript
interface ThemeConfig {
  colors: Record<string, string>; // 颜色配置，支持十六进制格式
}
```

## 生成的 CSS 变量

插件会为每个主题生成对应的 CSS 变量，例如：

```css
:root {
  --theme-primary: 59, 130, 246;
  --theme-secondary: 16, 185, 129;
}

.dark, .dark-theme {
  --theme-primary: 96, 165, 250;
  --theme-secondary: 52, 211, 153;
}
```

## 许可证

MIT © ddyytt