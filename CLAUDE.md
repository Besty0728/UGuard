# UGuard — Unity 应用授权管理平台

## 技术栈
- **前端**: React 18 + Vite + TailwindCSS + React Router v6
- **后端**: EdgeOne Pages Edge Functions (`onRequest`)
- **数据库**: EdgeOne Pages KV（统一命名空间：`ug_guard`）
- **包管理**: pnpm

## 项目结构
```
src/                    # 前端源码
  components/           # 通用组件
  contexts/             # React Context
  lib/                  # API 客户端、工具函数
  pages/                # 页面组件
  types/                # TypeScript 类型定义
functions/              # EdgeOne Edge Functions（后端）
  _middleware.js         # 全局中间件（Admin Key 校验 + CORS）
  api/                  # API 路由
```

## KV 命名约定
- 所有 Key 仅使用 **数字、字母、下划线**（EdgeOne 限制）
- 分隔符使用 `_`，禁止使用 `-` `:` 等字符
- Key 模式：`app_{id}`、`token_{hash}`、`device_{appId}_{fpHash}`、`log_{timestamp}_{rand}`

## 开发命令
- `pnpm dev` — 启动开发服务器（端口 3000）
- `pnpm build` — 构建生产版本
- `pnpm type-check` — TypeScript 类型检查

## 重要约定
- Token 格式：`sk_<64位hex>`，仅创建时返回明文，KV 中存 SHA-256 哈希
- `/api/verify` 不需要 Admin Key（Unity 客户端直接调用）
- 其他 `/api/*` 路由需要 `X-Admin-Key` Header
- Edge Functions 使用 `.js` 扩展名（非 `.ts`，EdgeOne 运行时）
