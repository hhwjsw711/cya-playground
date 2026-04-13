import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");
    return await ctx.storage.generateUploadUrl();
  },
});

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

    const attachments = await ctx.db
      .query("taskAttachments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(100);

    const result = [];
    for (const att of attachments) {
      const url = await ctx.storage.getUrl(att.storageId);
      let uploaderName: string | undefined;
      if (att.uploadedBy) {
        const uploader = await ctx.db.get("users", att.uploadedBy);
        uploaderName = uploader?.name ?? "未知";
      }
      result.push({
        _id: att._id,
        fileName: att.fileName,
        fileSize: att.fileSize,
        fileType: att.fileType,
        uploadedBy: uploaderName ?? "API",
        createdAt: att._creationTime,
        url,
      });
    }

    return result;
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    if (args.fileSize > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error("文件大小不能超过 20MB");
    }

    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) throw new Error("任务不存在");

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("不是该项目的成员");
    if (membership.role === "viewer") {
      await ctx.storage.delete(args.storageId);
      throw new Error("可查看成员无法上传附件");
    }

    const attachmentId = await ctx.db.insert("taskAttachments", {
      taskId: args.taskId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      uploadedBy: userId,
    });

    await ctx.runMutation(internal.activity.log, {
      action: "uploaded_attachment",
      userId,
      projectId: task.projectId,
      entityType: "task",
      entityId: args.taskId,
    });

    return attachmentId;
  },
});

export const remove = mutation({
  args: { attachmentId: v.id("taskAttachments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    const attachment = await ctx.db.get("taskAttachments", args.attachmentId);
    if (!attachment) throw new Error("附件不存在");

    const task = await ctx.db.get("tasks", attachment.taskId);
    if (!task) throw new Error("任务不存在");

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", task.projectId).eq("userId", userId),
      )
      .unique();
    if (!membership) throw new Error("不是该项目的成员");
    if (membership.role === "viewer") {
      throw new Error("可查看成员无法删除附件");
    }

    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete("taskAttachments", args.attachmentId);

    await ctx.runMutation(internal.activity.log, {
      action: "deleted_attachment",
      userId,
      projectId: task.projectId,
      entityType: "task",
      entityId: attachment.taskId,
    });

    return null;
  },
});

export const createViaApi = internalMutation({
  args: {
    taskId: v.id("tasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.fileSize > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error("文件大小不能超过 20MB");
    }

    return await ctx.db.insert("taskAttachments", {
      taskId: args.taskId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
    });
  },
});

export const listByTaskViaApi = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("taskAttachments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(100);

    return attachments.map((a) => ({
      id: a._id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      fileType: a.fileType,
      createdAt: a._creationTime,
    }));
  },
});

export const removeViaApi = internalMutation({
  args: { attachmentId: v.id("taskAttachments") },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get("taskAttachments", args.attachmentId);
    if (!attachment) throw new Error("附件不存在");

    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete("taskAttachments", args.attachmentId);

    return null;
  },
});

export const getAttachmentById = internalQuery({
  args: { attachmentId: v.id("taskAttachments") },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get("taskAttachments", args.attachmentId);
    return attachment;
  },
});

export const generateUploadUrlViaApi = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAttachmentUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
