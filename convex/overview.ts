import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getProjectOverview = query({
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
      .take(50);

    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const assignee = task.assigneeId
          ? await ctx.db.get("users", task.assigneeId)
          : null;

        const taskLabelRows = await ctx.db
          .query("taskLabels")
          .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
          .collect();

        const labels = await Promise.all(
          taskLabelRows.map((tl) => ctx.db.get("labels", tl.labelId)),
        );

        return {
          _id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ?? null,
          assigneeName: assignee?.name ?? null,
          labels: labels
            .filter((l) => l !== null)
            .map((l) => ({ name: l.name, color: l.color })),
        };
      }),
    );

    return { tasks: enrichedTasks };
  },
});
