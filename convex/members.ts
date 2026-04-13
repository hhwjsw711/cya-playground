import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import schema from "./schema";

const memberFields = schema.tables.projectMembers.validator.fields;

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!callerMembership) return [];

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(100);

    const result = [];
    for (const member of members) {
      const user = await ctx.db.get("users", member.userId);
      result.push({
        ...member,
        userName: user?.name ?? "未知",
        userEmail: user?.email ?? "",
      });
    }

    return result;
  },
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: memberFields.role,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId),
      )
      .unique();
    if (!callerMembership || callerMembership.role !== "admin") {
      throw new Error("仅管理员可添加成员");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (!targetUser) {
      throw new Error("未找到该邮箱对应的用户");
    }

    const existingMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", args.projectId).eq("userId", targetUser._id),
      )
      .unique();
    if (existingMembership) {
      throw new Error("该用户已是项目成员");
    }

    await ctx.db.insert("projectMembers", {
      projectId: args.projectId,
      userId: targetUser._id,
      role: args.role,
    });

    return null;
  },
});

export const updateRole = mutation({
  args: {
    memberId: v.id("projectMembers"),
    role: memberFields.role,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    const targetMembership = await ctx.db.get("projectMembers", args.memberId);
    if (!targetMembership) throw new Error("成员关系不存在");

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", targetMembership.projectId).eq("userId", userId),
      )
      .unique();
    if (!callerMembership || callerMembership.role !== "admin") {
      throw new Error("仅管理员可更改成员角色");
    }

    await ctx.db.patch("projectMembers", args.memberId, { role: args.role });
    return null;
  },
});

export const remove = mutation({
  args: { memberId: v.id("projectMembers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("未登录");

    const targetMembership = await ctx.db.get("projectMembers", args.memberId);
    if (!targetMembership) throw new Error("成员关系不存在");

    const project = await ctx.db.get("projects", targetMembership.projectId);
    if (!project) throw new Error("项目不存在");

    if (project.ownerId === targetMembership.userId) {
      throw new Error("无法移除项目所有者");
    }

    const callerMembership = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_userId", (q) =>
        q.eq("projectId", targetMembership.projectId).eq("userId", userId),
      )
      .unique();

    const isSelfRemoval = targetMembership.userId === userId;
    const isAdmin = callerMembership?.role === "admin";

    if (!isSelfRemoval && !isAdmin) {
      throw new Error("仅管理员可移除其他成员");
    }

    await ctx.db.delete("projectMembers", args.memberId);
    return null;
  },
});
