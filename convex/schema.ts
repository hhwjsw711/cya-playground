import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  projects: defineTable({
    name: v.string(),
    description: v.string(),
    ownerId: v.id("users"),
    apiKey: v.optional(v.string()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_apiKey", ["apiKey"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  })
    .index("by_projectId", ["projectId"])
    .index("by_userId", ["userId"])
    .index("by_projectId_and_userId", ["projectId", "userId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
    ),
    taskType: v.union(
      v.literal("feature_optimization"),
      v.literal("bug_handling"),
      v.literal("incident_handling"),
      v.literal("server_config"),
      v.literal("permission_config"),
      v.literal("security_risk"),
      v.literal("security_config"),
      v.literal("third_party_integration"),
      v.literal("consultation"),
      v.literal("data_maintenance"),
      v.literal("data_migration"),
      v.literal("emergency_drill"),
      v.literal("documentation"),
      v.literal("data_security"),
      v.literal("password_service_guarantee"),
      v.literal("security_compliance"),
      v.literal("consultation_assist"),
      v.literal("routine_inspection"),
      v.literal("other"),
    ),
    projectId: v.id("projects"),
    assigneeId: v.optional(v.id("users")),
    assigneeIds: v.optional(v.array(v.id("users"))),
    dueDate: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    proposer: v.optional(v.string()),
    proposedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    clientContact: v.optional(v.string()),
    subPlatform: v.optional(v.string()),
    district: v.optional(v.string()),
    progress: v.optional(v.number()),
    documentLinks: v.optional(
      v.array(
        v.object({
          docType: v.string(),
          docNumber: v.string(),
        }),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.array(v.string())),
  })
    .index("by_projectId", ["projectId"])
    .index("by_assigneeId", ["assigneeId"])
    .index("by_assigneeIds", ["assigneeIds"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_projectId_and_assigneeId", ["projectId", "assigneeId"])
    .index("by_projectId_and_assigneeIds", ["projectId", "assigneeIds"]),

  comments: defineTable({
    content: v.string(),
    taskId: v.id("tasks"),
    authorId: v.id("users"),
  }).index("by_taskId", ["taskId"]),

  activityLog: defineTable({
    action: v.string(),
    userId: v.id("users"),
    projectId: v.id("projects"),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.string()),
  }).index("by_projectId", ["projectId"]),

  labels: defineTable({
    name: v.string(),
    color: v.string(),
    projectId: v.id("projects"),
  }).index("by_projectId", ["projectId"]),

  taskLabels: defineTable({
    taskId: v.id("tasks"),
    labelId: v.id("labels"),
  })
    .index("by_taskId", ["taskId"])
    .index("by_labelId", ["labelId"])
    .index("by_taskId_and_labelId", ["taskId", "labelId"]),

  taskAttachments: defineTable({
    taskId: v.id("tasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    uploadedBy: v.optional(v.id("users")),
  })
    .index("by_taskId", ["taskId"])
    .index("by_storageId", ["storageId"]),
});
