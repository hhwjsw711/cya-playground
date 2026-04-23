import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getProjectStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(501);

    const truncated = tasks.length > 500;
    const visibleTasks = truncated ? tasks.slice(0, 500) : tasks;

    const now = Date.now();
    const totalTasks = visibleTasks.length;
    const doneTasks = visibleTasks.filter((t) => t.status === "done").length;
    const overdueTasks = visibleTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done",
    ).length;

    const tasksWithResponse = visibleTasks.filter(
      (t) => t.proposedAt && t.respondedAt && t.respondedAt >= t.proposedAt,
    );
    const avgResponseMs =
      tasksWithResponse.length > 0
        ? tasksWithResponse.reduce(
            (sum, t) => sum + (t.respondedAt! - t.proposedAt!),
            0,
          ) / tasksWithResponse.length
        : 0;
    const avgResponseMins =
      avgResponseMs > 0 ? Math.round(avgResponseMs / (1000 * 60)) : 0;

    const statusDistribution = [
      {
        name: "未排期",
        value: visibleTasks.filter((t) => t.status === "backlog").length,
      },
      {
        name: "未开始",
        value: visibleTasks.filter((t) => t.status === "todo").length,
      },
      {
        name: "进行中",
        value: visibleTasks.filter((t) => t.status === "in_progress").length,
      },
      {
        name: "已完成",
        value: visibleTasks.filter((t) => t.status === "done").length,
      },
    ];

    const TASK_TYPE_LABELS: Record<string, string> = {
      feature_optimization: "功能优化",
      bug_handling: "Bug处置",
      incident_handling: "故障处理",
      server_config: "服务器配置",
      permission_config: "权限配置",
      security_risk: "安全风险",
      security_config: "安全配置",
      third_party_integration: "三方对接",
      consultation: "咨询协助",
      data_maintenance: "数据维护统计",
      data_migration: "数据迁移",
      emergency_drill: "应急演练",
      documentation: "文档编写",
      other: "其他",
    };

    const taskTypeDistribution = Object.entries(
      visibleTasks.reduce<Record<string, number>>((acc, t) => {
        const key = t.taskType ?? "feature_optimization";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([key, value]) => ({ name: TASK_TYPE_LABELS[key] ?? key, value }))
      .sort((a, b) => b.value - a.value);

    const SUB_PLATFORM_LABELS: Record<string, string> = {
      platform_wide: "公共数据平台",
      ai_data_service: "AI数据服务",
      datav: "DataV",
      work_portal: "工作门户",
      core_business_platform: "核心业务平台",
      enterprise_tags: "企业标签",
      staging_db: "前置库",
      data_sharing_platform: "数据共享平台",
      data_archive_platform: "数据归档平台",
      data_feedback: "数据回流",
      data_exchange_platform: "数据交换平台",
      data_open_platform: "数据开放平台",
      data_catalog_platform: "数据目录平台",
      data_report_platform: "数据上报平台",
      data_governance_platform: "数据治理平台",
      town_warehouse: "镇街数仓",
      topic_db: "专题库",
      resource_view: "资源视窗",
      authorized_operation: "授权运营",
    };

    const subPlatformDistribution = Object.entries(
      visibleTasks.reduce<Record<string, number>>((acc, t) => {
        const key = t.subPlatform ?? "未分配";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([key, value]) => ({ name: SUB_PLATFORM_LABELS[key] ?? key, value }))
      .sort((a, b) => b.value - a.value);

    const DISTRICT_LABELS: Record<string, string> = {
      city_level: "市本级",
      development_zone: "开发区",
      liandu: "莲都区",
      qingtian: "青田县",
      jinyun: "缙云县",
      suichang: "遂昌县",
      songyang: "松阳县",
      yunhe: "云和县",
      qingtian_county: "庆元县",
      jingning: "景宁县",
      longquan: "龙泉市",
    };

    const districtDistribution = Object.entries(
      visibleTasks.reduce<Record<string, number>>((acc, t) => {
        const key = t.district ?? "city_level";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([key, value]) => ({ name: DISTRICT_LABELS[key] ?? key, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalTasks,
      doneTasks,
      completionRate:
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      avgResponseMins,
      overdueTasks,
      statusDistribution,
      taskTypeDistribution,
      subPlatformDistribution,
      districtDistribution,
      truncated,
    };
  },
});
