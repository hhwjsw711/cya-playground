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
