# 工析智枢： IndusInsight Hub · 前端（Vue）

本目录为「工析智枢： IndusInsight Hub」的 Web 前端：提供登录与个人信息、工作台与仪表盘、智能体创建与运行、技能（Skill）与工具（Tool）、知识库与文档、社区浏览与收藏、公告等能力；通过 REST 与 **Server-Sent Events（SSE）** 与后端 `java-back-end`（默认 `http://localhost:8080`）通信。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建 | Vite 7 |
| 语言 | TypeScript |
| 路由 | Vue Router 5 |
| 状态 | Pinia |
| UI | Element Plus |
| 编辑器 | Monaco Editor（`vite-plugin-monaco-editor`） |
| 富文本/Markdown | markdown-it、KaTeX、DOMPurify 等 |

开发期可选：Vue DevTools（`vite-plugin-vue-devtools`）。

## 环境要求

- **Node.js**：`^20.19.0` 或 `>=22.12.0`（见 `package.json` 的 `engines`）
- 包管理：npm（仓库内含 `package-lock.json`）

## 快速开始

```bash
cd front-end
npm install
npm run dev
```

默认在 Vite 开发服务器打开应用（一般为 `http://localhost:5173`）。生产构建与本地预览：

```bash
npm run build
npm run preview
```

`build` 会先执行 `vue-tsc` 类型检查，再通过 Vite 打包。

## 与后端联调

1. 启动 **Java 后端**（仓库内 `java-back-end`），默认端口 **`8080`**，`context-path` 为 `/`（见 `java-back-end/src/main/resources/application.yml`）。
2. 前端在开发模式下将 **`/api`** 代理到 `http://localhost:8080`（见 `vite.config.ts`），因此浏览器请求使用**同源相对路径** `/api/...` 即可，无需单独配置 `VITE_*` 环境变量。
3. 大文件上传代理超时已放宽（约 600s），避免 multipart 上传被代理中断。

若后端部署在其他主机或端口，请修改 `vite.config.ts` 中 `server.proxy['/api'].target`，或在前端改为使用完整后端地址并处理跨域（需后端 CORS 配合）。

## 鉴权与请求约定

- **登录态**：`localStorage` 键名 `token`、`userInfo`（见 `src/utils/storage/auth.ts`）。
- **请求头**：已登录时，封装层会在 `fetch` 请求上附加 **`satoken`** 请求头，与后端 Sa-Token 约定一致（见 `src/utils/request.ts`）。
- **统一响应**：后端 JSON 形如 `{ code, message, data }`；**`code === 0` 视为成功**，非 0 会抛出带业务码的错误（`src/types/modules/commonApi.ts`）。
- **HTTP 401/403**：会清空本地登录态并跳转 `/login`，可带 `redirect` 查询参数回到原页面。

业务接口集中在 `src/api/`（如 `auth.ts`、`agent.ts`、`taskStream.ts`、`knowledgeBase.ts` 等），底层统一走 `get` / `post` / `put` / `del` / `postFormData`。

## 智能体运行与流式事件

智能体任务相关接口除普通 JSON 外，还支持 **SSE** 流式输出。`src/api/taskStream.ts` 对多种事件类型（如 `llm_chunk`、`tool_start`、`kb_retrieval`、`complete`、`error` 等）做了归一化解析，供工作台 UI 订阅展示。SSE 请求同样通过 `buildAuthHeaders` 携带 `satoken`（`src/api/taskShared.ts`）。

## 目录结构（概要）

```
front-end/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.ts              # 入口：Pinia、Router、全局样式、Element Plus 样式
│   ├── App.vue
│   ├── router/index.ts      # 路由表与登录守卫（meta.requiresAuth）
│   ├── api/                 # 后端 API 封装
│   ├── views/               # 页面级视图
│   ├── components/          # 可复用组件（按业务域分子目录）
│   ├── composables/         # 组合式函数
│   ├── stores/              # Pinia（如 user）
│   ├── utils/               # 请求、存储等工具
│   ├── types/               # TypeScript 类型
│   ├── styles/              # 全局样式
│   └── mock/                # 部分开发用 mock 数据（按需）
└── public/
```

路径别名 **`@`** 指向 `src/`（`vite.config.ts` 的 `resolve.alias`）。

## 主要路由一览

| 路径 | 说明 |
|------|------|
| `/` | 首页 |
| `/login` | 登录（账号密码 / 手机验证码，见 `src/api/auth.ts`） |
| `/dashboard` | 登录后仪表盘 |
| `/community/agents`、`/community/skills`、`/community/tools`、`/community/knowledge` | 社区浏览 |
| `/announcements`、`/announcements/:id` | 公告列表与详情 |
| `/agents/create`、`/agents/external/create` | 创建平台内 / 外部智能体 |
| `/agents/:id/use` | 智能体使用工作台 |
| `/my/agents`、`/my/agents/:id/edit` | 我的智能体与编辑 |
| `/skills/create`、`/my/skills`、`/my/skills/:id/edit` | 技能创建与我的技能 |
| `/tools/create`、`/my/tools`、`/my/tools/:id/edit` | 工具创建与我的工具 |
| `/knowledge/create`、`/my/knowledge`、文档与检索相关子路径 | 知识库 |
| `/my/favorites` | 我的收藏 |
| `/profile` | 个人资料与安全等 |

路由元信息 `requiresAuth: true` 的页面在未携带有效 `token` 时会重定向到登录页。

## 脚本说明

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run build-only` | 仅 Vite 构建（跳过 `vue-tsc`） |
| `npm run preview` | 本地预览构建产物 |
| `npm run type-check` | 仅运行 `vue-tsc` |
| `npm run lint` | 依次执行 oxlint 与 ESLint（均带 `--fix`） |
| `npm run format` | Prettier 格式化 `src/` |
| `npm run test:unit` | Vitest 单元测试（如 `src/api/taskStream.spec.ts`） |

> 说明：仓库未强制提交 `vitest.config.ts`；当前 `npm run test:unit` 使用 Vitest 默认配置即可运行（见 `src/api/taskStream.spec.ts`）。若需覆盖率、路径别名与生产构建完全一致等，可自行补充 Vitest 配置文件。

## 代码规范

- **ESLint** + **Vue / TypeScript** 规则，`eslint-config-prettier` 与 Prettier 对齐。
- **Oxlint** 用于快速静态检查（`lint:oxlint`）。

建议在提交前执行 `npm run lint` 与 `npm run type-check`。

## 与仓库其他部分的关系

- **后端**：`../java-back-end`，提供 `/api/**` 与 SSE 等接口。
- **Python 智能体服务等**：由后端配置转发或回调（如 `agent-system.api-base-url`），前端不直接依赖其端口，仅需保证用户浏览器能访问当前站点与后端即可。

---

如有部署到子路径的需求，可在 Vite 中配置 `base`，并确保后端同源策略与反向代理将前端静态资源与 `/api` 一并正确转发。
