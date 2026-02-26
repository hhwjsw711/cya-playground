import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const MEMBERSHIPS_LIMIT = 50;

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

export const listMemberships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(MEMBERSHIPS_LIMIT);

    const results = await Promise.all(
      memberships.map(async (m) => {
        const project = await ctx.db.get("projects", m.projectId);
        if (!project) return null;
        return {
          projectId: m.projectId,
          projectName: project.name,
          role: m.role,
          joinedAt: m._creationTime,
        };
      }),
    );

    return results.filter((r) => r !== null);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch("users", userId, { name: args.name });
    return null;
  },
});
