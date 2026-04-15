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

    const completedWithDuration = visibleTasks.filter(
      (t) => t.startedAt && t.completedAt,
    );
    const avgCycleMs =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce(
            (sum, t) => sum + (t.completedAt! - t.startedAt!),
            0,
          ) / completedWithDuration.length
        : 0;
    const avgCycleDays =
      avgCycleMs > 0
        ? Math.round((avgCycleMs / (1000 * 60 * 60 * 24)) * 10) / 10
        : 0;

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

    const priorityDistribution = [
      {
        name: "紧急",
        value: visibleTasks.filter((t) => t.priority === "urgent").length,
      },
      {
        name: "高",
        value: visibleTasks.filter((t) => t.priority === "high").length,
      },
      {
        name: "中",
        value: visibleTasks.filter((t) => t.priority === "medium").length,
      },
      {
        name: "低",
        value: visibleTasks.filter((t) => t.priority === "low").length,
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
      documentation: "文档编写",
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

    const assigneeMap = new Map<string, { name: string; count: number }>();
    for (const task of visibleTasks) {
      if (!task.assigneeId) continue;
      const existing = assigneeMap.get(task.assigneeId);
      if (existing) {
        existing.count++;
      } else {
        const user = await ctx.db.get("users", task.assigneeId);
        assigneeMap.set(task.assigneeId, {
          name: user?.name ?? "未知",
          count: 1,
        });
      }
    }
    const assigneeWorkload = Array.from(assigneeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const unassignedCount = visibleTasks.filter((t) => !t.assigneeId).length;
    if (unassignedCount > 0) {
      assigneeWorkload.push({ name: "未分配", count: unassignedCount });
    }

    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    const since = now - FOURTEEN_DAYS_MS;
    const completedInRange = visibleTasks.filter(
      (t) => t.completedAt && t.completedAt >= since,
    );

    const dailyCompletion: { date: number; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = now - i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = completedInRange.filter(
        (t) => t.completedAt! >= dayStart && t.completedAt! < dayEnd,
      ).length;
      dailyCompletion.push({ date: dayStart, count });
    }

    return {
      totalTasks,
      doneTasks,
      completionRate:
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      avgCycleDays,
      overdueTasks,
      statusDistribution,
      priorityDistribution,
      taskTypeDistribution,
      assigneeWorkload,
      dailyCompletion,
      truncated,
    };
  },
});
