import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) return [];

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) return [];

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .take(100);

    const result = [];
    for (const comment of comments) {
      const author = await ctx.db.get("users", comment.authorId);
      result.push({
        ...comment,
        authorName: author?.name ?? "未知",
      });
    }

    return result;
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) throw new Error("任务不存在");

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("不是该项目的成员");

    const commentId = await ctx.db.insert("comments", {
      content: args.content,
      taskId: args.taskId,
      authorId: userId,
    });

    await ctx.runMutation(internal.activity.log, {
      action: "added_comment",
      userId,
      projectId: task.projectId,
      entityType: "comment",
      entityId: commentId,
    });

    return commentId;
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    const comment = await ctx.db.get("comments", args.commentId);
    if (!comment) throw new Error("评论不存在");

    if (comment.authorId !== userId) {
      throw new Error("只能删除自己的评论");
    }

    await ctx.db.delete("comments", args.commentId);
    return null;
  },
});
