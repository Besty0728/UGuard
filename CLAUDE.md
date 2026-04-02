# UGuard

UGuard 是一个面向 Unity 应用授权管理的后台与接入文档项目。

## 项目目标

- 提供 Unity 客户端可直接调用的授权校验接口
- 提供管理后台，用于管理应用、设备、日志、密码等
- 提供接入文档和 Unity 示例脚本，帮助客户端快速集成

## 技术栈

- 前端：React 18 + TypeScript + Vite + TailwindCSS + React Router v6
- 后端：EdgeOne Pages Edge Functions
- 存储：EdgeOne Pages KV，绑定名必须是 `ug_guard`
- 包管理：pnpm
- 运行环境：Node.js >= 18

## 常用命令

- `pnpm install`：安装依赖
- `pnpm dev`：启动前端开发服务器
- `pnpm dev:server`：启动本地 EdgeOne 模拟服务
- `pnpm dev:all`：同时启动前端和本地模拟服务
- `pnpm type-check`：运行 TypeScript 类型检查
- `pnpm build`：生产构建
- `pnpm preview`：预览构建产物
- `pnpm lint`：运行 ESLint

## 环境变量

- `ADMIN_SECRET`：后台初始管理员密码

本地参考 `.env.example`，生产部署时需要在 EdgeOne Pages 中配置。

## 目录结构

```text
src/
  App.tsx
  main.tsx
  index.css
  assets/
    icons/
    snippets/
      UGuardShield.cs          # 文档页展示并可下载的 Unity 单文件示例
  components/
    common/
  contexts/
    AuthContext.tsx
    I18nContext.tsx
  lib/
    api.ts
    i18n.ts
    utils.ts
  pages/
    Dashboard.tsx
    Apps.tsx
    AppDetail.tsx
    AccessLogs.tsx
    Docs.tsx
    Login.tsx
    Settings.tsx
  types/

functions/
  _middleware.js               # Admin Key 校验 + CORS
  _shared.js                   # 共享工具：KV、时段、地理限制、响应封装
  api/
    auth.js
    verify.js
    logs.js
    logs/[logId].js
    apps/index.js
    apps/[appId].js
    apps/[appId]/devices/index.js
    apps/[appId]/devices/[deviceId].js
    user/password.js

dev-server.mjs                 # 本地 EdgeOne 环境模拟
```

## 前端说明

- 管理后台页面集中在 `src/pages`
- `src/contexts/AuthContext.tsx` 负责登录态
- `src/contexts/I18nContext.tsx` 负责中英文切换
- 文档页在 `src/pages/Docs.tsx`
- 文档页会直接读取 `src/assets/snippets/UGuardShield.cs` 原始内容，并提供下载按钮

## 后端说明

### 核心接口

- `POST /api/verify`
  - Unity 客户端直接调用
  - 不需要 `X-Admin-Key`
  - 负责 token、应用状态、过期时间、地理限制、开放时段、设备封禁、设备数量限制检查

- 其他 `/api/*`
  - 需要 `X-Admin-Key`

### 共享逻辑

`functions/_shared.js` 中包含：

- `getKV`
- `jsonResponse`
- `hydrateAppData`
- `normalizeAccessWindow`
- `getAccessWindowStatus`
- `normalizeGeoRestriction`
- `getGeoRestrictionStatus`
- `getRequestLocation`

## KV 约定

EdgeOne KV 对 key 有限制。项目里必须只使用数字、字母、下划线，不要使用 `-`、`:` 等字符。

当前 key 约定：

- `app_{id}`
- `token_{sha256_hash}`
- `device_{appId}_{fpHash}`
- `devices_{appId}`
- `log_{timestamp}_{rand}`

## 授权与安全约定

- Token 格式固定为 `sk_<64位hex>`
- Token 明文只在创建时返回
- KV 中只保存 Token 的 SHA-256 哈希
- `verify` 接口依赖设备指纹
- 设备记录会保存 `firstSeen`、`lastSeen`、`lastIP`、`accessCount` 等信息

## 文档与 Unity 集成说明

项目当前包含两类 Unity 示例：

- 基础示例：演示如何调用 `/api/verify`
- 高级示例：`UGuardShield.cs`

`UGuardShield.cs` 当前能力：

- 支持三种验证策略：
  - `PlatformAndTimestamp`
  - `PlatformOnly`
  - `TimestampOnly`
- 支持三种防护模式：
  - `BlackScreen`
  - `ForceQuit`
  - `MessageThenBlackScreen`
- 时间戳验证优先读取网络时间
- 网络时间不可用时回退到本地双存储时间证据
- 默认输出 `Debug.Log`
- 如果 Unity 工程中定义了 `TMP_PRESENT`，可选绑定 `TMP_Text` 输出状态

## 开发注意事项

- Edge Functions 必须使用 `.js`，不要改成 `.ts`
- 修改后端接口时，优先同步更新文档页示例
- 修改 `UGuardShield.cs` 时，注意它既是下载资源，也是文档展示源码
- 如果新增 KV key，必须继续遵守现有命名规则
- 如果调整 `/api/verify` 返回结构，需要同步检查 Unity 示例代码和文档说明

## 推荐验证流程

在修改功能后，至少执行：

1. `pnpm type-check`
2. `pnpm build`

如果修改的是 Unity 文档脚本，只能验证前端展示与下载链路；Unity 编译需要在 Unity 工程内单独验证。
