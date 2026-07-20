---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'caa39bd2-e99b-4fc9-95da-9e72640c9f9a'
  PropagateID: 'caa39bd2-e99b-4fc9-95da-9e72640c9f9a'
  ReservedCode1: 'd3fa4eb0-9b9e-4411-8dd7-6e4cfc461f97'
  ReservedCode2: 'd3fa4eb0-9b9e-4411-8dd7-6e4cfc461f97'
---

# 贡献指南

感谢你愿意为 cya-playground 贡献代码！无论是修复 Bug、完善文档还是提出新功能，都非常欢迎。

## 行为准则

参与本项目的所有贡献者请保持友善、尊重的沟通氛围。技术讨论对事不对人，关注问题本身。

## 开发环境搭建

### 前置依赖

- **Node.js** ≥ 20（推荐 LTS 版本）
- **包管理器**：项目使用 npm，`bun.lock` 可忽略；如使用 pnpm/yarn 请自行处理锁文件冲突
- **Convex 账户**：在 https://dashboard.convex.dev 注册（有免费额度）

### 启动本地开发

```bash
# 1. 克隆仓库
git clone <your-fork-url>
cd cya-playground

# 2. 安装依赖
npm install

# 3. 初始化 Convex 后端（首次运行会引导登录并创建 deployment）
npx convex dev --until-success

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入上一步生成的 CONVEX_DEPLOYMENT / VITE_CONVEX_URL / VITE_CONVEX_SITE_URL

# 5. 同时启动前端与后端开发服务
npm run dev
```

浏览器会自动打开 http://localhost:5173 。

### 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动 Vite 前端 + Convex 后端开发服务 |
| `npm run dev:frontend` | 仅启动前端 |
| `npm run dev:backend` | 仅启动 Convex 后端 |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npm run lint` | TypeScript 检查 + ESLint（`--max-warnings 0`） |
| `npm run preview` | 预览生产构建产物 |

## 代码规范

### TypeScript

- `strict: true` 已开启，请勿使用 `any` 绕过类型检查
- 未使用的变量与参数会被 TypeScript 标记为错误
- 后端 Convex 函数在 `convex/` 下有独立 `tsconfig.json`

### 代码风格

- 项目根目录有 `.prettierrc`，请使用 Prettier 格式化
- 缩进 2 空格，字符串使用双引号，分号结尾
- 函数与组件命名：组件采用 PascalCase，函数与变量采用 camelCase
- 文件命名：组件文件 PascalCase（如 `TaskDetail.tsx`），后端函数文件 camelCase（如 `taskCounts.ts`）

### 后端约定

- **数据模型**：所有表结构定义在 `convex/schema.ts`，修改 schema 后需运行 `npx convex dev` 同步
- **权限校验**：每个 `mutation` / `query` 必须显式校验用户登录状态与项目角色，参考 `convex/projects.ts` 中的 `requireAdmin` 模式
- **活动日志**：Web 端所有写操作应通过 `internal.activity.log` 记录审计日志
- **错误消息**：面向用户的错误消息统一使用中文，与现有风格保持一致

### 前端约定

- **状态管理**：使用 Convex 的 `useQuery` / `useMutation` hooks，不引入额外状态库
- **样式**：使用 Tailwind CSS v4，通过 `@theme` 定义主题变量
- **路由**：当前为手写状态路由（`App.tsx`），新增页面请沿用现有模式
- **常量复用**：`TASK_TYPE_OPTIONS` / `SUB_PLATFORM_OPTIONS` / `DISTRICT_OPTIONS` 等枚举常量在多个组件中重复定义，修改时需同步所有位置（详见 `architecture.md` 的字段扩展记录章节）

## 提交规范

### Commit 消息格式

```
<type>: <subject>

<body>
```

**type** 可选值：

| type | 含义 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既不是新功能也不是修 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建、依赖、配置等杂项 |

**示例**：
```
feat: 任务列表支持按子平台筛选

- 新增 SUB_PLATFORM_OPTIONS 筛选器
- 看板顶部增加下拉选择组件
- 空结果显示友好提示
```

### 分支策略

- `main` 为稳定分支，保持可发布状态
- 开发请从 `main` 拉取特性分支，命名 `feat/<短描述>` 或 `fix/<短描述>`
- PR 合并前确保 `npm run lint` 与 `npm run build` 通过

## Pull Request 流程

1. Fork 本仓库到你自己的账号
2. 创建特性分支：`git checkout -b feat/your-feature`
3. 提交修改并推送到你的 Fork
4. 向 `main` 分支发起 Pull Request，PR 描述中请包含：
   - 修改目的与背景
   - 涉及的文件与关键改动
   - 是否需要 schema 迁移或环境变量调整
   - 截图（若涉及 UI 变更）
5. 等待代码评审，根据反馈迭代

### PR 检查清单

提交 PR 前请自检：

- [ ] `npm run lint` 无报错
- [ ] `npm run build` 成功
- [ ] 若修改了 `convex/schema.ts`，已通过 `npx convex dev` 验证 schema 可同步
- [ ] 若新增了任务类型 / 子平台 / 区县，已同步更新所有相关文件（清单见 `architecture.md`）
- [ ] 若修改了 API 接口，已更新 `README.md` 的 API 文档
- [ ] 文档与代码行为一致（图表、字段、流程描述等）

## 新增任务类型 / 子平台 / 区县时的同步清单

由于这三类枚举在前端多处定义且在后端有校验，每次扩展需要同步修改以下文件（详细说明见 `architecture.md` 的"字段扩展记录"章节）：

- `convex/schema.ts`
- `convex/http.ts`（POST 与 PATCH 两处校验）
- `convex/analytics.ts`（中文标签映射）
- `src/components/TaskDetail.tsx`
- `src/components/ProjectView.tsx`
- `src/components/ApiPanel.tsx`（AI 提示词 + 接口文档）
- `README.md`（API 文档表格）

**漏改任何一个文件都会导致前后端行为不一致**，提交 PR 前请逐项核对。

## 报告问题

- Bug 报告请使用 GitHub Issue，描述复现步骤、期望行为与实际行为
- 功能建议同样通过 Issue 提交，说明使用场景与预期效果
- 提交 Issue 前请先搜索是否已有相同问题，避免重复

## 许可证

提交的贡献将按照 [Apache License 2.0](./LICENSE.txt) 许可发布。

> AI生成