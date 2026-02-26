import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const TASK_STATUS = ["todo", "in_progress", "in_review", "done"] as const;

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
      .take(500);

    const byStatus: Record<string, number> = {};
    for (const status of TASK_STATUS) {
      byStatus[status] = 0;
    }
    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
    }

    const byPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const task of tasks) {
      byPriority[task.priority] = (byPriority[task.priority] ?? 0) + 1;
    }

    const assignedCount = tasks.filter((t) => t.assigneeId !== undefined).length;
    const unassignedCount = tasks.length - assignedCount;

    return {
      totalTasks: tasks.length,
      byStatus,
      byPriority,
      assignedCount,
      unassignedCount,
    };
  },
});
