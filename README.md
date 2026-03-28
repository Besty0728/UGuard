# UGuard — Unity 应用授权管理平台

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![EdgeOne](https://img.shields.io/badge/EdgeOne-Pages-0052D9.svg)](https://cloud.tencent.com/product/teo)

**UGuard** 是一款专为 Unity 开发者设计的轻量级、高性能应用授权与设备指纹管理平台。基于腾讯云 EdgeOne Pages 边缘函数与 KV 存储构建，提供全球毫秒级的验证响应。

---

## ✨ 核心特性

### 1. 极致交互与视觉
- **Uiverse 风格化 UI**：深度集成现代化的 UI 组件，支持玻璃拟态 (Glassmorphism) 效果。
- **“弹性流动”交互**：自定义下拉列表与操作按钮具备丝滑的过渡动画与物理反馈。
- **三位一体操作栏**：高度与宽度精准对齐的组件设计，满足像素级强迫症。

### 2. 动态数据可视化
- **贝塞尔曲线趋势图**：使用三次贝塞尔算法（Cubic Bézier）绘制的平滑访问趋势图。
- **自适应动态量程**：Y 轴刻度根据实际访问数据自动扩展，直观展示验证频率。
- **多维度筛选**：支持按应用、按验证结果实时过滤数据。

### 3. 安全与鉴权
- **设备指纹识别**：防止 Token 滥用，精确锁定单台设备。
- **哈希安全存储**：Token 以 SHA-256 哈希形式存储于 KV，确保服务端数据安全。
- **状态实时切换**：一键禁用应用或封禁特定设备 IP。

---

## 🚀 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **样式方案**: TailwindCSS + 原生 CSS 动效
- **后端架构**: EdgeOne Pages Edge Functions (`onRequest`)
- **数据存储**: EdgeOne Pages KV (命名空间: `ug_guard`)
- **路由管理**: React Router v6

---

## 🚀 部署与配置 (EdgeOne Pages)

本项目专为腾讯云 **EdgeOne Pages** 深度优化，支持边缘函数与 KV 存储的无缝集成。

### 1. KV 存储准备
1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)。
2. 进入 **Pages > KV 存储**，创建一个任意名称的命名空间。
3. 记下命名空间 ID。

### 2. 创建 Pages 项目
1. 在 **服务总览 > Pages** 中点击“新建项目”。
2. 连接您的代码仓库（GitHub/GitLab）。
3. **构建设置**：
   - **框架预设**: `Vite` (或手动配置)
   - **构建命令**: `pnpm build`
   - **输出目录**: `dist`
   - **Node.js 版本**: `>= 18.0.0`

### 3. 环境与绑定配置
在 Pages 项目详情页面的 **设置 > KV存储以及项目设置** 中：
1. **KV 绑定**：将之前创建的 `ug_guard` 命名空间绑定，变量名称**必须**为`ug_guard`
2. **环境变量**：在 **环境配置** 中添加 `ADMIN_SECRET` 变量，作为初始登陆密码，后续可以在管理后台修改，但环境变量设置的密码始终可用。

---

## 🛠️ 本地开发

### 1. 环境准备
确保您的 Node.js 版本 `>= 18.0.0`。

### 2. 安装依赖
```bash
pnpm install
```

### 3. 本地开发
本项目提供了一个高性能的本地模拟服务器 (`dev-server.mjs`)，用于模拟 EdgeOne 环境。
```bash
# 同时启动模拟服务器与前端 Vite
pnpm dev:all
```

---

## 📂 项目结构

```text
src/                    # 前端源码
  components/           # UI 组件 (Buttons, Dropdowns, Charts, etc.)
  lib/                  # API 客户端、工具函数
  pages/                # 页面组件 (Dashboard, AccessLogs, Apps)
  types/                # TypeScript 类型定义
functions/              # EdgeOne Edge Functions (后端逻辑)
  api/                  # 服务端 API 路由
dev-server.mjs          # 本地模拟服务器
index.css               # 全局 UI 系统与动效定义
```

---

## 📜 重要约定 (KV 命名)
为了兼容 EdgeOne KV 的限制，所有 Key 仅使用 **数字、字母、下划线**：
- 应用记录：`app_{appId}`
- Token 映射：`token_{sha256_hash}`
- 设备绑定：`device_{appId}_{fpHash}`
- 访问日志：`log_{timestamp}_{rand}`

---

## 📄 开源协议
本项目采用 [MIT License](LICENSE) 协议。
