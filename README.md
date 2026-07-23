# 项目管理

> 她告诉你不用担心项目管理

基于 Convex + React + Vite + Tailwind CSS 的团队任务管理应用，看板风格。面向政务云集约运维场景，内置需求信息追踪、SLA 响应耗时统计、政务文档关联、数据洞察与 AI 助手集成。

## 功能亮点

- **密码登录**（Convex Auth）
- **项目管理**，支持角色权限控制（管理员 / 可编辑 / 可查看）
- **看板任务面板**（待规划 / 待办 / 进行中 / 已完成）
- **任务指派**（乙方责任人，支持多人）、优先级、截止日期
- **需求信息追踪**（提出人、甲方对接人、提出时间、响应时间、所属子平台、所属区县，自动计算响应耗时）
- **任务时间自动追踪**（开始 / 完成时间戳、耗时统计、逾期标记）
- **关联文档追踪**（需求单、更新单、Bug 分析报告、故障分析报告、安全风险处置确认单、权限申请表、云资源申请表）
- **任务情况说明**（多人协作记录）
- **任务备注**（个人标记提醒，可关键字筛选）
- **活动日志**
- **标签管理**，支持任务与标签关联
- **成员管理**（添加 / 角色变更 / 移除）
- **REST API 接口**（通过 API 密钥查询、创建、更新、删除任务）
- **任务附件上传**（通过 Convex File Storage 存储，最大 20MB）
- **项目数据洞察面板**（指标卡片、状态分布、类型分布、子平台分布、区县分布）
- **AI 助手集成**（一键复制提示词，跳转 DeepSeek / 豆包通过对话管理任务）
- **级联清理**：项目和任务删除时后台分批级联清理，同步删除 File Storage 防止存储泄漏
- **聚合计数**：通过 `@convex-dev/aggregate` 实现任务计数，避免全表扫描

## 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 后端 | [Convex](https://convex.dev/) | 数据库、服务函数、认证、HTTP actions |
| 前端 | React 19 + Vite 7 | 单页应用 |
| 样式 | Tailwind CSS v4 | 原子化 CSS，支持系统级暗色模式 |
| 认证 | Convex Auth | 密码登录 |
| 聚合 | @convex-dev/aggregate | 项目任务计数 |
| 图表 | Recharts | 数据可视化 |
| 部署 | Cloudflare Workers | 前端 SPA 通过 `wrangler.jsonc` 配置 |

## 快速开始

### 前置要求

- **Node.js** ≥ 20（推荐 LTS）
- **npm** ≥ 10
- **Convex 账户**：在 https://dashboard.convex.dev 注册（有免费额度）

### 本地开发

```bash
# 1. 克隆仓库
git clone <your-fork-url>
cd cya-playground

# 2. 安装依赖
npm install

# 3. 初始化 Convex 后端
# 首次运行会引导浏览器登录 Convex 并自动创建 deployment
npx convex dev --until-success

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入上一步生成的部署信息

# 5. 启动开发服务（同时启动前端 + 后端）
npm run dev
```

浏览器自动打开 http://localhost:5173 ，点击「注册账号」创建第一个用户即可开始使用。

> `npm run dev` 会通过 `npm-run-all` 并行启动 Vite 前端（`dev:frontend`）与 Convex 后端（`dev:backend`）。
> `predev` 钩子会先确保 Convex 后端就绪并打开 Convex Dashboard。

## 部署

### 后端部署（Convex）

Convex 后端自动托管在 Convex 云端，无需自行部署服务器。

```bash
# 生产环境部署
npx convex deploy

# 部署后会输出生产 deployment 的 URL，将其填入 .env.production
```

### 前端部署（Cloudflare Workers）

项目根目录已配置 `wrangler.jsonc`，支持将前端 SPA 部署到 Cloudflare Workers。

```bash
# 1. 创建 .env.production（已在 .gitignore 中）
cp .env.example .env.production
# 填入生产 deployment 的 VITE_CONVEX_URL 与 VITE_CONVEX_SITE_URL

# 2. 构建前端
npm run build

# 3. 部署到 Cloudflare Workers（需先安装 wrangler 并登录）
npx wrangler deploy
```

也可将 `dist/` 目录托管到任何静态站点服务（Vercel、Netlify、GitHub Pages 等），只需配置环境变量即可。

## 环境变量

| 变量 | 作用 | 获取方式 |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | 关联本地代码与 Convex 部署 | `npx convex dev` 自动写入 `.env.local` |
| `VITE_CONVEX_URL` | 前端连接后端的 WebSocket URL | Convex Dashboard 首页 |
| `VITE_CONVEX_SITE_URL` | REST API 的基础 URL | Convex Dashboard 首页，形如 `https://<deployment>.convex.site` |

开发环境使用 `.env.local`，生产构建使用 `.env.production`。两者均已在 `.gitignore` 中，不会被提交。模板见 `.env.example`。

## 项目架构

### 目录结构

```
cya-playground/
├── convex/                    # 后端（Convex 函数与数据模型）
│   ├── schema.ts              #   数据模型定义（9 张表）
│   ├── auth.ts                #   Convex Auth 配置（密码登录）
│   ├── auth.config.ts         #   认证提供者配置
│   ├── http.ts                #   HTTP API 路由（REST 接口）
│   ├── projects.ts            #   项目 CRUD + API 密钥管理
│   ├── tasks.ts               #   任务 CRUD + API 操作 + 级联清理
│   ├── comments.ts            #   情况说明 CRUD
│   ├── labels.ts              #   标签管理 + 任务标签关联
│   ├── members.ts             #   成员管理（添加 / 角色变更 / 移除）
│   ├── attachments.ts         #   附件上传 / 删除 + File Storage 管理
│   ├── activity.ts            #   活动日志（internalMutation）
│   ├── users.ts               #   当前用户查询 + 资料更新
│   ├── taskCounts.ts          #   基于 aggregate 的项目任务计数
│   ├── analytics.ts           #   项目统计分析查询
│   └── convex.config.ts       #   Convex 应用配置（含 aggregate 组件）
├── src/                       # 前端（React 19 + Vite）
│   ├── main.tsx               #   入口，ConvexProvider + ToastProvider
│   ├── App.tsx                #   路由 + 认证判断 + 顶栏
│   ├── index.css              #   Tailwind + 中文字体栈
│   └── components/
│       ├── Dashboard.tsx      #   项目列表 + 创建项目
│       ├── ProjectView.tsx    #   看板视图 + 洞察面板 + 成员管理面板
│       ├── TaskDetail.tsx     #   任务详情模态框
│       ├── ApiPanel.tsx       #   API 密钥管理 + 接口文档 + AI 助手入口
│       ├── Analytics.tsx      #   项目数据洞察面板（Recharts 图表）
│       ├── SignIn.tsx         #   登录 / 注册
│       └── Toast.tsx          #   全局通知
├── index.html                 # lang="zh-CN"
├── wrangler.jsonc             # Cloudflare Workers 部署配置
└── package.json
```

### 双通道架构

系统同时服务两类调用方：

- **Web 端**：用户通过浏览器登录后，使用 Convex 实时订阅（WebSocket）操作数据，所有写操作自动记录活动日志
- **API 端**：外部系统通过 REST API + Bearer Token 鉴权操作任务，适合自动化集成与 AI 助手调用

两通道共用同一份数据模型，通过 `internalQuery` / `internalMutation` 在 HTTP action 中复用后端逻辑。

更多设计细节（数据模型字段、索引、权限矩阵、级联删除策略等）见 [architecture.md](./architecture.md)。

## API 接口

管理员和可编辑成员可在项目详情页查看 API 密钥，通过 HTTP 接口管理任务。

所有接口均需在请求头中提供 API 密钥：`Authorization: Bearer <api_key>`

### 查询任务列表

```
GET /api/tasks
Authorization: Bearer <api_key>
```

### 创建任务

```
POST /api/tasks
Authorization: Bearer <api_key>

{
  "title": "新任务",
  "description": "任务描述",
  "status": "todo",
  "taskType": "feature_optimization",
  "assigneeIds": ["userId1", "userId2"],
  "proposer": "提出人",
  "proposedAt": 1705276800000,
  "respondedAt": 1705284000000,
  "clientContact": "甲方对接人",
  "subPlatform": "platform_wide"
}
```

### 更新任务

```
PATCH /api/tasks/:taskId
Authorization: Bearer <api_key>

{
  "status": "done"
}
```

### 删除任务

```
DELETE /api/tasks/:taskId
Authorization: Bearer <api_key>
```

### 状态值参考

| 字段          | 可选值                                                                                                                                                                                                                                                                                                                                                                   | 说明                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| status        | backlog / todo / in_progress / done                                                                                                                                                                                                                                                                                                                                      |                         |
| taskType      | feature_optimization / bug_handling / incident_handling / server_config / permission_config / security_risk / security_config / third_party_integration / consultation / data_maintenance / data_migration / emergency_drill / documentation / data_security / password_service_guarantee / security_compliance / consultation_assist / routine_inspection / other       |                         |
| assigneeIds   | array                                                                                                                                                                                                                                                                                                                                                                    | 乙方责任人 ID 数组      |
| proposer      | string                                                                                                                                                                                                                                                                                                                                                                   | 提出人（自由文本）      |
| proposedAt    | number                                                                                                                                                                                                                                                                                                                                                                   | 提出时间（Unix 时间戳） |
| respondedAt   | number                                                                                                                                                                                                                                                                                                                                                                   | 响应时间（Unix 时间戳） |
| clientContact | string                                                                                                                                                                                                                                                                                                                                                                   | 甲方对接人（自由文本）  |
| subPlatform   | platform_wide / ai_data_service / datav / work_portal / core_business_platform / enterprise_tags / staging_db / data_sharing_platform / data_archive_platform / data_feedback / data_exchange_platform / data_open_platform / data_catalog_platform / data_report_platform / data_governance_platform / town_warehouse / topic_db / resource_view / authorized_operation | 所属子平台              |
| district      | city_level / development_zone / liandu / qingtian / jinyun / suichang / songyang / yunhe / qingyuan / jingning / longquan                                                                                                                                                                                                                                                | 所属区县                |
| documentLinks | array                                                                                                                                                                                                                                                                                                                                                                    | 关联文档数组            |
| docType       | demand_form(需求单) / update_form(更新单) / bug_report(Bug分析报告) / incident_report(故障分析报告) / security_confirm(安全风险处置确认单) / permission_form(权限申请表) / cloud_resource_form(云资源申请表)                                                                                                                                                             | 文档类型                |
| tags          | array                                                                                                                                                                                                                                                                                                                                                                    | 备注数组（字符串）      |
| notes         | array                                                                                                                                                                                                                                                                                                                                                                    | 情况说明数组（字符串）  |

## 附件接口

附件上传采用三步流程：获取上传地址 → 上传文件 → 创建附件记录。每个附件最大 20MB。

### 查询任务附件列表

```
GET /api/tasks/:taskId/attachments
Authorization: Bearer <api_key>
```

### 获取附件上传地址（第一步）

```
POST /api/tasks/:taskId/attachments/upload-url
Authorization: Bearer <api_key>
```

返回 `{ "uploadUrl": "https://..." }`

### 上传文件到存储（第二步）

将文件以二进制方式 POST 到上一步返回的 uploadUrl：

```
POST <uploadUrl>
Content-Type: <文件MIME类型>

<文件二进制内容>
```

返回 `{ "storageId": "..." }`

### 创建附件记录（第三步）

```
POST /api/tasks/:taskId/attachments
Authorization: Bearer <api_key>

{
  "storageId": "<第二步返回的storageId>",
  "fileName": "报告.pdf",
  "fileSize": 1024,
  "fileType": "application/pdf"
}
```

### 删除附件

```
DELETE /api/tasks/:taskId/attachments/:attachmentId
Authorization: Bearer <api_key>
```

## 数据洞察

项目详情页顶部切换「洞察」Tab，查看项目数据分析：

- **指标卡片**：总任务数、完成率、平均响应周期、逾期任务数
- **任务状态分布**（环形图）
- **任务类型分布**（横向条形图）
- **子平台分布**（横向条形图）
- **区县分布**（横向条形图）

统计数据上限 500 个任务，超出时显示警告。

## AI 助手

项目 API 面板内置 AI 助手入口，流程：

1. 生成 API 密钥
2. 点击「复制提示词」— 自动将包含 API 文档和密钥的结构化提示词复制到剪贴板
3. 点击「打开 DeepSeek」或「打开豆包」— 跳转至 AI 平台
4. 粘贴提示词，通过自然语言对话管理任务

## 项目管理相关

- **本地运行**：`npm install` → `npm run dev`
- **贡献指南**：见 [CONTRIBUTING.md](./CONTRIBUTING.md)
- **安全策略**：见 [SECURITY.md](./SECURITY.md)
- **变更日志**：见 [CHANGELOG.md](./CHANGELOG.md)
- **架构文档**：见 [architecture.md](./architecture.md)

## 许可证

本项目基于 [Apache License 2.0](./LICENSE.txt) 开源。

