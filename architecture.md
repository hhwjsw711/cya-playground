# 任务流 — 项目架构文档

## 项目概述

团队任务管理应用，看板风格。支持项目级权限控制、REST API 集成、级联删除。

## 技术栈

- **后端**: Convex（数据库、函数、认证、HTTP actions）
- **前端**: React 19 + Vite + Tailwind CSS v4
- **认证**: Convex Auth（密码登录）
- **聚合**: @convex-dev/aggregate（任务计数）

## 目录结构

```
convex/
  schema.ts          # 数据模型定义
  auth.ts            # Convex Auth 配置
  auth.config.ts     # 认证提供者配置
  http.ts            # HTTP API 路由（REST 接口）
  projects.ts        # 项目 CRUD + API 密钥管理
  tasks.ts           # 任务 CRUD + API 操作 + 级联清理
  comments.ts        # 评论 CRUD
  labels.ts          # 标签管理 + 任务标签关联
  members.ts         # 成员管理（添加/角色变更/移除）
  attachments.ts     # 附件上传/删除 + File Storage 管理
  activity.ts        # 活动日志（internalMutation）
  users.ts           # 当前用户查询 + 资料更新
  taskCounts.ts      # 基于 aggregate 的项目任务计数
  convex.config.ts   # Convex 应用配置（含 aggregate 组件）

src/
  App.tsx            # 路由 + 认证判断 + 顶栏
  main.tsx           # 入口，ConvexProvider + ToastProvider
  index.css          # Tailwind + 中文字体栈
  components/
    Dashboard.tsx    # 项目列表 + 创建项目
    ProjectView.tsx  # 看板视图 + 成员管理面板
    TaskDetail.tsx   # 任务详情模态框
    ApiPanel.tsx     # API 密钥管理 + 接口文档
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
├─ priority                                 ├─ entityType
├─ projectId         labels                └─ entityId
├─ assigneeId        ├─ name
├─ dueDate           └─ color              taskLabels
├─ startedAt (auto)                         ├─ taskId
└─ completedAt (auto) └─ projectId          └─ labelId

                      └─ projectId         taskAttachments
                                           ├─ taskId
                                           ├─ storageId
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
| 创建评论           | 是       | 是     | 否     |
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
- `startedAt` 首次进入 in_progress 时自动写入，不覆盖；`completedAt` 进入 done 时写入，回退时清空

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

（暂无）
