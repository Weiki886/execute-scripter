# Execute Scripter

一个美观实用的脚本执行器，支持多行命令执行和快捷方式保存

![Execute Scripter](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/Electron-29.1.0-47848f.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Material-UI](https://img.shields.io/badge/Material--UI-5.14.20-0081cb.svg)

## 项目简介

Execute Scripter 是一个基于 Electron + React 构建的桌面应用程序，专为需要频繁执行脚本命令的开发者和系统管理员设计。它提供了直观的图形界面，让复杂的命令行操作变得简单高效。

## 功能特性

### 核心功能
- **多行命令执行** - 支持一次性执行多条命令，按顺序逐行执行
- **实时输出显示** - 命令执行结果实时显示，支持滚动查看完整输出
- **工作目录切换** - 支持 `cd` 命令切换工作目录，后续命令在新目录下执行
- **快捷方式管理** - 保存常用命令组合，一键执行复杂脚本

### 用户界面
- **现代化设计** - 基于 Material-UI 的美观界面
- **响应式布局** - 自适应不同窗口尺寸
- **智能滚动** - 输出区域支持智能自动滚动和手动浏览
- **清洁模式** - 打包后隐藏菜单栏和开发者工具

### 数据管理
- **本地存储** - 快捷方式保存在本地，无需网络连接
- **持久化** - 应用重启后保留所有保存的快捷方式

## 系统要求

- **操作系统**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **内存**: 至少 512MB RAM
- **存储空间**: 约 200MB 可用空间
- **网络**: 仅开发环境需要，打包后可完全离线使用

## 安装与使用

### 开发环境

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd execute-scripter
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run electron-dev
   ```

### 生产环境

1. **构建应用**
   ```bash
   npm run build
   ```

2. **打包桌面应用**
   ```bash
   npm run electron-package
   ```
   
   打包完成后，在 `dist` 目录下找到可执行文件。

## 使用指南

### 基本操作

1. **执行单个命令**
   - 在命令输入框中输入命令（如：`java -version`）
   - 点击"执行命令"按钮
   - 在下方输出区域查看执行结果

2. **执行多行命令**
   ```
   cd /d D:\projects
   dir
   java -version
   ```
   每行一个命令，按顺序执行

3. **切换工作目录**
   ```
   cd /d C:\Users\Username\Desktop
   echo "当前目录已切换"
   ```

### 快捷方式管理

1. **保存快捷方式**
   - 在命令输入框中输入常用的命令组合
   - 点击"保存快捷方式"按钮
   - 输入名称和描述
   - 点击"保存"

2. **使用快捷方式**
   - 在右侧快捷方式列表中点击任意快捷方式
   - 命令将自动填充到输入框
   - 点击"执行命令"即可运行

3. **删除快捷方式**
   - 点击快捷方式右侧的删除按钮
   - 确认删除操作

### 高级功能

- **智能滚动**: 输出内容自动跟随最新输出，手动滚动时暂停自动跟随
- **滚动到底部**: 点击"滚动到底部"按钮快速查看最新输出
- **清空输出**: 点击"清空输出"按钮清除输出区域内容

## 项目结构

```
execute-scripter/
├── public/                 # Electron 主进程文件
│   ├── electron.js        # Electron 主程序
│   ├── preload.js         # 预加载脚本
│   └── index.html         # HTML 模板
├── src/                   # React 前端源码
│   ├── App.js            # 主应用组件
│   ├── index.js          # React 入口
│   └── index.css         # 样式文件
├── build/                # React 构建输出
├── dist/                 # Electron 打包输出
└── package.json          # 项目配置
```

## 开发技术栈

### 前端框架
- **React** 18.2.0 - 用户界面框架
- **Material-UI** 5.14.20 - UI 组件库
- **Emotion** - CSS-in-JS 解决方案

### 桌面应用
- **Electron** 29.1.0 - 跨平台桌面应用框架
- **Node.js** - 后端运行环境

### 开发工具
- **React Scripts** - React 开发工具链
- **Electron Builder** - 应用打包工具
- **Concurrently** - 并行执行开发命令

## 开发脚本

```json
{
  "start": "启动 React 开发服务器",
  "build": "构建 React 生产版本",
  "electron": "启动 Electron 应用",
  "electron-dev": "并行启动 React 和 Electron 开发环境",
  "electron-package": "打包桌面应用程序"
}
```

## 安全特性

- **上下文隔离** - Electron 安全最佳实践
- **Node 集成禁用** - 防止安全漏洞
- **内容安全策略** - 保护应用免受 XSS 攻击
- **开发工具禁用** - 生产版本中完全禁用开发者工具

## 故障排除

### 常见问题

1. **命令执行失败**
   - 检查命令语法是否正确
   - 确认当前工作目录是否正确
   - 查看输出区域的错误信息

2. **快捷方式丢失**
   - 快捷方式保存在用户主目录的 `.execute-scripter-shortcuts.json` 文件中
   - 检查文件权限和磁盘空间

3. **界面显示异常**
   - 尝试重启应用程序
   - 检查系统显示缩放设置

### 调试模式

开发环境下按 `F12` 打开开发者工具进行调试。

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

---

*让命令行操作变得简单高效！*
