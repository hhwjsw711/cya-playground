---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'b2ea36c7-5adc-4310-a2d3-b6a0591f7b56'
  PropagateID: 'b2ea36c7-5adc-4310-a2d3-b6a0591f7b56'
  ReservedCode1: '4ec421ef-294f-4600-9d4e-c58b9ad07bc7'
  ReservedCode2: '4ec421ef-294f-4600-9d4e-c58b9ad07bc7'
---

# 变更日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [Unreleased]

### 文档与开源准备

- 修正 `LICENSE.txt` 版权方为 `Hu Hongwei`（原为模板默认的 `Convex, Inc.`）
- 修复 `DISTRICT_OPTIONS` 中庆元县的 value 拼写错误：`qingtian_county` → `qingyuan`（经核实生产环境无存量数据，安全修复）
- 移除 `ApiPanel.tsx` 中 4 处业务标识示例 `HXYW-REQ-*`，改为通用示例 `REQ-*`
- 修正 `architecture.md` 图表表格中实际不存在的"近 14 天完成趋势（折线图）"条目
- 新增 `.env.example`、`CONTRIBUTING.md`、`SECURITY.md`、`CHANGELOG.md`
- 重写 `README.md`，补充项目介绍、部署指南、架构说明、环境变量配置等开源标配内容

## [0.1.0] - 2026-04-15

### 首次发布

定位为政务云集约运维工单系统，核心能力：

- 密码登录（Convex Auth）
- 项目管理与角色权限（管理员 / 可编辑 / 可查看）
- 看板任务面板（待规划 / 待办 / 进行中 / 已完成）
- 任务指派、优先级、截止日期、进度追踪
- 需求信息追踪（提出人、甲方对接人、提出时间、响应时间、所属子平台、所属区县，自动计算响应耗时）
- 任务时间自动追踪（开始 / 完成时间戳、耗时统计、逾期标记）
- 关联文档追踪（需求单、更新单、Bug 分析报告、故障分析报告、安全风险处置确认单、权限申请表、云资源申请表）
- 任务备注（个人标记提醒，可关键字筛选）
- 活动日志
- 标签管理
- 成员管理（添加 / 角色变更 / 移除）
- REST API（API 密钥鉴权，支持任务与附件的 CRUD）
- 任务附件上传（Convex File Storage，最大 20MB）
- 项目与任务删除时后台分批级联清理
- 基于 `@convex-dev/aggregate` 的任务计数
- 项目数据洞察面板（指标卡片、任务状态分布、任务类型分布、子平台分布、区县分布）
- AI 助手集成（一键复制提示词，跳转 DeepSeek / 豆包通过对话管理任务）

> AI生成