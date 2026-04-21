# 任务流 — 项目架构文档

## 项目概述

团队任务管理应用，看板风格。支持项目级权限控制、REST API 集成、AI 助手集成、数据洞察、级联删除。

## 技术栈

- **后端**: Convex（数据库、函数、认证、HTTP actions）
- **前端**: React 19 + Vite + Tailwind CSS v4
- **认证**: Convex Auth（密码登录）
- **聚合**: @convex-dev/aggregate（任务计数）
- **图表**: Recharts（数据可视化）

## 目录结构

```
convex/
  schema.ts          # 数据模型定义
  auth.ts            # Convex Auth 配置
  auth.config.ts     # 认证提供者配置
  http.ts            # HTTP API 路由（REST 接口）
  projects.ts        # 项目 CRUD + API 密钥管理
  tasks.ts           # 任务 CRUD + API 操作 + 级联清理
  comments.ts       # 情况说明 CRUD
  labels.ts          # 标签管理 + 任务标签关联
  members.ts         # 成员管理（添加/角色变更/移除）
  attachments.ts     # 附件上传/删除 + File Storage 管理
  activity.ts        # 活动日志（internalMutation）
  users.ts           # 当前用户查询 + 资料更新
  taskCounts.ts      # 基于 aggregate 的项目任务计数
  analytics.ts      # 项目统计分析查询
  convex.config.ts   # Convex 应用配置（含 aggregate 组件）

src/
  App.tsx            # 路由 + 认证判断 + 顶栏
  main.tsx           # 入口，ConvexProvider + ToastProvider
  index.css          # Tailwind + 中文字体栈
  components/
    Dashboard.tsx    # 项目列表 + 创建项目
    ProjectView.tsx  # 看板视图 + 洞察面板 + 成员管理面板
    TaskDetail.tsx   # 任务详情模态框
    ApiPanel.tsx     # API 密钥管理 + 接口文档 + AI 助手入口
    Analytics.tsx    # 项目数据洞察面板（Recharts 图表）
    SignIn.tsx       # 登录/注册
    Toast.tsx        # 全局通知

index.html           # lang="zh-CN"
```

## 数据模型

```
users                projects              projectMembers
├─ name              ├─ name               ├─ projectId
├─ email             ├─ description        ├─ userId
└─ image             ├─ ownerId            └─ role (admin|editor|viewer)
                     └─ apiKey

tasks                comments              activityLog
├─ title             ├─ content            ├─ action
├─ description       ├─ taskId             ├─ userId
├─ status            └─ authorId           ├─ projectId
├─ taskType                                 ├─ entityType
├─ projectId         labels                └─ entityId
├─ assigneeId        ├─ name
├─ dueDate           └─ color
├─ proposer                                taskLabels
├─ proposedAt                               ├─ taskId
├─ respondedAt       └─ projectId          └─ labelId
├─ clientContact
├─ subPlatform                             taskAttachments
├─ progress (0-100)                         ├─ taskId
├─ startedAt                                ├─ storageId
                                            ├─ fileName
                                           ├─ fileSize
                                           ├─ fileType
                                           └─ uploadedBy
```

### 索引

- projects: `by_ownerId`, `by_apiKey`
- projectMembers: `by_projectId`, `by_userId`, `by_projectId_and_userId`
- tasks: `by_projectId`, `by_assigneeId`, `by_projectId_and_status`, `by_projectId_and_assigneeId`
- comments: `by_taskId`
- activityLog: `by_projectId`
- labels: `by_projectId`
- taskLabels: `by_taskId`, `by_labelId`, `by_taskId_and_labelId`
- taskAttachments: `by_taskId`, `by_storageId`

## 权限模型

| 操作               | 管理员   | 可编辑 | 可查看 |
| ------------------ | -------- | ------ | ------ |
| 修改项目信息       | 是       | 否     | 否     |
| 删除项目           | 仅所有者 | 否     | 否     |
| 管理 API 密钥      | 是       | 否     | 否     |
| 查看 API 密钥      | 是       | 是     | 否     |
| 查看 API 文档      | 是       | 是     | 是     |
| 创建/更新/删除任务 | 是       | 是     | 否     |
| 创建情况说明       | 是       | 是     | 否     |
| 上传/删除附件      | 是       | 是     | 否     |
| 管理成员           | 是       | 否     | 否     |

## REST API

部署在 `https://{deployment}.convex.site`，通过 `VITE_CONVEX_SITE_URL` 获取基础 URL。

**鉴权**: `Authorization: Bearer <api_key>`，API 密钥绑定项目，持有者拥有该项目任务的完全操作权限。

| 方法   | 路径                                         | 说明             |
| ------ | -------------------------------------------- | ---------------- |
| GET    | /api/tasks                                   | 查询任务列表     |
| POST   | /api/tasks                                   | 创建任务         |
| PATCH  | /api/tasks/:taskId                           | 更新任务         |
| DELETE | /api/tasks/:taskId                           | 删除任务         |
| GET    | /api/tasks/:taskId/attachments               | 查询任务附件列表 |
| POST   | /api/tasks/:taskId/attachments/upload-url    | 获取附件上传地址 |
| POST   | /api/tasks/:taskId/attachments               | 创建附件记录     |
| DELETE | /api/tasks/:taskId/attachments/:attachmentId | 删除附件         |

路由使用 `pathPrefix` 匹配（`/api/tasks/`），从 URL pathname 提取 taskId。

### 关键实现细节

- HTTP action 中无用户会话，`getAuthUserId` 返回 null，因此 PATCH/DELETE 使用 `internal.tasks.getTaskById`（internalQuery）校验任务归属
- `getByApiKey` 为 internalQuery，防止通过公共 query 枚举 apiKey
- `projects.list` 显式返回字段，不包含 apiKey
- 级联删除使用后台分批调度（BATCH_SIZE=50），通过 `scheduler.runAfter` 递归清理
- 级联删除同步清理 File Storage（`ctx.storage.delete`），防止存储泄漏
- 附件上传采用两步流程：先获取 upload URL，上传文件后创建附件记录
- 需求信息字段（proposer / proposedAt / respondedAt / clientContact / subPlatform / startedAt / completedAt）支持清空：前端传空字符串或 0，后端 handler 统一 `|| undefined` 转换后 `db.patch` 删除字段
- 任务进度（progress）：0-100 可选整数，前端通过滑块（步进 5）实时调节；REST API 自动 clamp 到 0-100；进度与状态不自动联动

## 任务进度

任务支持 0-100% 进度标识，仅对 `in_progress` 状态的任务有实际意义，但所有状态均可设置：

- **看板卡片**：进度 > 0 时在标题下方显示进度条（蓝色填充 + 百分比数字）
- **任务详情**：截止日期旁显示滑块控件，步进 5%，可编辑角色可拖拽调整，可查看角色只读
- **REST API**：POST/PATCH 支持 `progress` 字段，后端自动 clamp 到 0-100 范围
- 进度与状态不自动联动（设为 done 不自动变 100%），由用户手动管理

## 需求信息

任务卡片包含「需求信息」区域，支持查看/编辑切换模式：

- **查看态**：紧凑一行展示（提出人 · 甲方对接人 · 提出时间 · 响应时间 + 自动计算响应耗时），无值时显示「暂无」+ 蓝色「补充」按钮
- **编辑态**：2×2 grid 表单 + 保存/取消按钮，空字符串/空时间 → 清除对应字段
- **新建任务**：仅填写标题、状态、类型、提出人，其余需求信息由项目经理后续补充
- **乙方责任人**：即原 assigneeId，任务指派的乙方内部负责人
- **所属子平台**：标准选项（公共数据平台 / AI数据服务 / DataV / 工作门户 / 核心业务平台 / 企业标签 / 前置库 / 数据共享平台 / 数据归档平台 / 数据回流 / 数据交换平台 / 数据开放平台 / 数据目录平台 / 数据上报平台 / 数据治理平台 / 镇街数仓 / 专题库 / 资源视窗），单值可选，用于标记任务归属范围

## 数据洞察

项目级分析面板，通过 ProjectView 顶部「看板 / 洞察」Tab 切换访问。

### 指标卡片

| 指标         | 数据来源                      | 说明                   |
| ------------ | ----------------------------- | ---------------------- |
| 总任务数     | tasks 计数                    | 上限 500，超出显示警告 |
| 完成率       | done / total                  | 百分比 + 分数          |
| 平均响应周期 | proposedAt → respondedAt 均值 | 仅统计有响应时间的任务 |

| 逾期任务 | dueDate < now && status ≠ done | 大于 0 时红色警示 |

### 图表

| 图表             | 类型            | 数据来源                   |
| ---------------- | --------------- | -------------------------- |
| 任务状态分布     | 环形图（Donut） | tasks.status 分组          |
| 近 14 天完成趋势 | 折线图          | tasks.completedAt 按日分桶 |
| 任务类型分布     | 横向条形图      | tasks.taskType 分组        |

### 后端查询

`analytics.getProjectStats`：单次查询聚合所有统计，`take(501)` 检测截断，日期分桶返回时间戳由前端格式化（避免服务端时区问题）。

## AI 助手集成

API 面板内置 AI 助手入口，用户可一键复制包含完整 API 文档的提示词，跳转至 DeepSeek 或豆包平台，通过自然语言对话管理任务。

### 流程

1. 用户生成 API 密钥
2. 点击「复制提示词」，将包含 Base URL、密钥、所有端点的结构化提示词复制到剪贴板
3. 点击「打开 DeepSeek」或「打开豆包」跳转至对应平台
4. 在 AI 平台粘贴提示词，开始对话式任务管理

### 提示词生成

`buildAiPrompt(baseUrl, apiKey)` 动态构建，包含：

- 认证方式（Bearer token）
- 全部 CRUD 端点及参数说明
- 操作注意事项（先查询再操作、操作后确认、谨慎删除）

## 国际化

已全量翻译为简体中文：

- 后端错误消息全部中文
- 前端 UI 文本全部中文
- 日期格式 `toLocaleDateString("zh-CN")`
- 字体栈: `-apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
- `index.html` lang="zh-CN"
- 角色翻译: admin→管理员, editor→可编辑, viewer→可查看

## 移动端适配

- 看板: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- 表单: `flex-col sm:flex-row` 竖排转横排
- TaskDetail 弹窗: `pt-4 sm:pt-16`, `max-h-[90vh] sm:max-h-[80vh]`
- 内边距: `px-4 sm:px-6`

## 待开发功能

- Recharts 图表暗色模式坐标轴样式优化
- Recharts 动态 import 减小首屏包体积
- 个人级指标（我的待办/逾期/跨项目分布）
