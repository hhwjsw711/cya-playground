# 任务流

基于 Convex + React + Vite + Tailwind CSS 的团队任务管理应用，看板风格。

## 功能

- 密码登录（Convex Auth）
- 项目管理，支持角色权限控制（管理员 / 可编辑 / 可查看）
- 看板任务面板（待规划、待办、进行中、已完成）
- 任务指派、优先级、截止日期
- 任务评论
- 活动日志
- 标签管理，支持任务与标签关联
- 成员管理（添加 / 角色变更 / 移除）
- REST API 接口（通过 API 密钥查询、创建、更新、删除任务）
- 项目和任务删除时后台分批级联清理
- 通过 `@convex-dev/aggregate` 实现任务计数

## 技术栈

- [Convex](https://convex.dev/) — 后端：数据库、服务函数、认证
- React 19 + Vite — 前端
- Tailwind CSS v4 — 样式
- Convex Auth — 密码认证

## 本地运行

```
npm install
npm run dev
```

## API 接口

管理员和可编辑成员可在项目详情页生成 API 密钥，通过 HTTP 接口管理任务。

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
  "priority": "medium"
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

| 字段     | 可选值                              |
| -------- | ----------------------------------- |
| status   | backlog / todo / in_progress / done |
| priority | low / medium / high / urgent        |
