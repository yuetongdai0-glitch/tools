# patch-cli



项目补丁合并工具，实现多项目代码复用和差异化管理。

## ✨ 特性

- 实时合并 `public_src` 和 `patch` 目录到 `src`
- 智能文件监听和增量更新
- 多语言文件自动合并
进程自动管理
- 支持自定义钩子脚本

## 📦 安装

```bash
npm install patch-cli --save-dev
# 或
yarn add patch-cli -D
```

## 🚀 快速开始

### 基础使用
```bash
npx patch-cli --dir <补丁子目录>
```

### 典型项目结构
```
your-project/
├── public_src/      # 公共基础代码
├── patch/           # 项目差异代码
│   └── projectA/    # 项目A补丁
│   └── projectB/    # 项目B补丁
└── src/             # 生成的合并代码 (自动创建)
```

## ⚙️ 配置

创建 `umi-patch.config.json` 文件：

```json
{
  "patchChildDir": "projectA",
  "umiCommand": "max dev",
  "hooks": {
    "preMerge": "npm run build:base",
    "postMerge": "npm run generate-types"
  }
}
```

## 📌 命令行参数

| 参数 | 缩写 | 描述 |
|------|------|------|
| `--dir` | `-d` | 指定补丁子目录 (必需) |
| `--config` | `-c` | 指定配置文件路径 (默认: `patch.config.json`) |
| `--no-watch` |  | 禁用文件监听模式 |
| `--verbose` | `-v` | 显示详细日志 |

## 🔧 高级用法

### 多语言合并规则
1. `public_src/locales` 为基础语言文件
2. `patch/<project>/locales` 为项目定制文件
3. 合并规则：
    - 同名文件：深度合并
    - 新增文件：直接复制

### 自定义文件处理
在配置中扩展 `extensions` 字段：

```json
{
  "extensions": {
    "customMerge": [".config"],
    "ignore": [".tmp"]
  }
}
```



## 📄 许可证

MIT © 已读乱回