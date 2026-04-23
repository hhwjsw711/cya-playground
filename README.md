# 任务流

基于 Convex + React + Vite + Tailwind CSS 的团队任务管理应用，看板风格。

## 功能

- 密码登录（Convex Auth）
- 项目管理，支持角色权限控制（管理员 / 可编辑 / 可查看）
- 看板任务面板（待规划、待办、进行中、已完成）
- 任务指派（乙方责任人）、优先级、截止日期
- 需求信息追踪（提出人、甲方对接人、提出时间、响应时间、所属子平台、所属区县，自动计算响应耗时）
- 任务时间自动追踪（开始/完成时间戳、耗时统计、逾期标记）
- 关联文档追踪（需求单、更新单、Bug分析报告、故障分析报告、安全风险处置确认单、权限申请表、云资源申请表）
- 任务情况说明
- 任务备注（个人标记提醒，可关键字筛选）
- 活动日志
- 标签管理，支持任务与标签关联
- 成员管理（添加 / 角色变更 / 移除）
- REST API 接口（通过 API 密钥查询、创建、更新、删除任务）
- 任务附件上传（通过 Convex File Storage 存储，最大 20MB）
- 项目和任务删除时后台分批级联清理
- 通过 `@convex-dev/aggregate` 实现任务计数
- 项目数据洞察面板（状态分布、完成趋势、优先级分布、成员工作量、逾期统计）
- AI 助手集成（一键复制提示词，跳转 DeepSeek / 豆包通过对话管理任务）

## 技术栈

- [Convex](https://convex.dev/) — 后端：数据库、服务函数、认证
- React 19 + Vite — 前端
- Tailwind CSS v4 — 样式
- Convex Auth — 密码认证
- Recharts — 数据可视化

## 本地运行

```
npm install
npm run dev
```

## 数据洞察

项目详情页顶部切换「洞察」Tab，查看项目数据分析：

- **指标卡片**：总任务数、完成率、平均响应周期、逾期任务数
- **任务状态分布**（环形图）
- **近 14 天完成趋势**（折线图）
- **任务类型分布**（横向条形图）

统计数据上限 500 个任务，超出时显示警告。

## AI 助手

项目 API 面板内置 AI 助手入口，流程：

1. 生成 API 密钥
2. 点击「复制提示词」— 自动将包含 API 文档和密钥的结构化提示词复制到剪贴板
3. 点击「打开 DeepSeek」或「打开豆包」— 跳转至 AI 平台
4. 粘贴提示词，通过自然语言对话管理任务

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

### 状态值

| 字段          | 可选值                                                                                                                                                                                                                                                                                                                                            | 说明                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| status        | backlog / todo / in_progress / done                                                                                                                                                                                                                                                                                                               |                         |
| taskType      | feature_optimization / bug_handling / incident_handling / server_config / permission_config / security_risk / security_config / third_party_integration / consultation / data_maintenance / data_migration / emergency_drill / documentation / other                                                                                              |                         |
| proposer      | string                                                                                                                                                                                                                                                                                                                                            | 提出人（自由文本）      |
| proposedAt    | number                                                                                                                                                                                                                                                                                                                                            | 提出时间（Unix 时间戳） |
| respondedAt   | number                                                                                                                                                                                                                                                                                                                                            | 响应时间（Unix 时间戳） |
| clientContact | string                                                                                                                                                                                                                                                                                                                                            | 甲方对接人（自由文本）  |
| subPlatform   | platform_wide / ai_data_service / datav / work_portal / core_business_platform / enterprise_tags / staging_db / data_sharing_platform / data_archive_platform / data_feedback / data_exchange_platform / data_open_platform / data_catalog_platform / data_report_platform / data_governance_platform / town_warehouse / topic_db / resource_view | 所属子平台              |
| district      | city_level / development_zone / liandu / qingtian / jinyun / suichang / songyang / yunhe / qingtian_county / jingning / longquan                                                                                                                                                                                                                  | 所属区县                |
| documentLinks | array                                                                                                                                                                                                                                                                                                                                             | 关联文档数组            |
| docType       | demand_form(需求单) / update_form(更新单) / bug_report(Bug分析报告) / incident_report(故障分析报告) / security_confirm(安全风险处置确认单) / permission_form(权限申请表) / cloud_resource_form(云资源申请表)                                                                                                                                      | 文档类型                |
| tags          | array                                                                                                                                                                                                                                                                                                                                             | 备注数组（字符串）      |
| notes         | array                                                                                                                                                                                                                                                                                                                                             | 情况说明数组（字符串）  |

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
