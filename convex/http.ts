import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function authenticate(
  ctx: any,
  req: Request,
): Promise<Id<"projects"> | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(
      { error: "缺少 API 密钥，请在 Authorization 头中提供 Bearer token" },
      401,
    );
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();
  if (!apiKey) {
    return jsonResponse({ error: "API 密钥不能为空" }, 401);
  }

  const projectId = await ctx.runQuery(internal.projects.getByApiKey, {
    apiKey,
  });
  if (!projectId) {
    return jsonResponse({ error: "无效的 API 密钥" }, 401);
  }

  return projectId;
}

function parsePathSegments(req: Request): string[] {
  return new URL(req.url).pathname.replace(/\/$/, "").split("/");
}

async function getTaskSafely(
  ctx: any,
  taskId: string,
  projectId: Id<"projects">,
): Promise<{ task: any } | Response> {
  let task: any;
  try {
    task = await ctx.runQuery(internal.tasks.getTaskById, {
      taskId: taskId as Id<"tasks">,
    });
  } catch {
    return jsonResponse({ error: "无效的任务 ID" }, 400);
  }
  if (!task || task.projectId !== projectId) {
    return jsonResponse({ error: "任务不存在或不属于该项目" }, 404);
  }
  return { task };
}

async function getAttachmentSafely(
  ctx: any,
  attachmentId: string,
  taskId: Id<"tasks">,
): Promise<{ attachment: any } | Response> {
  let attachment: any;
  try {
    attachment = await ctx.runQuery(internal.attachments.getAttachmentById, {
      attachmentId: attachmentId as Id<"taskAttachments">,
    });
  } catch {
    return jsonResponse({ error: "无效的附件 ID" }, 400);
  }
  if (!attachment || attachment.taskId !== taskId) {
    return jsonResponse({ error: "附件不存在或不属于该任务" }, 404);
  }
  return { attachment };
}

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/tasks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

http.route({
  pathPrefix: "/api/tasks/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

http.route({
  path: "/api/tasks",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authResult = await authenticate(ctx, req);
    if (authResult instanceof Response) return authResult;
    const projectId = authResult;

    const tasks = await ctx.runQuery(internal.tasks.listByProjectViaApi, {
      projectId,
    });

    return jsonResponse({ tasks });
  }),
});

http.route({
  path: "/api/tasks",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authResult = await authenticate(ctx, req);
    if (authResult instanceof Response) return authResult;
    const projectId = authResult;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "无效的 JSON 请求体" }, 400);
    }

    if (typeof body !== "object" || body === null) {
      return jsonResponse({ error: "请求体必须是 JSON 对象" }, 400);
    }

    const b = body as Record<string, unknown>;
    if (typeof b.title !== "string" || !b.title.trim()) {
      return jsonResponse({ error: "title 为必填字段" }, 400);
    }

    const validStatuses = ["backlog", "todo", "in_progress", "done"];
    const validTaskTypes = [
      "feature_optimization",
      "bug_handling",
      "incident_handling",
      "server_config",
      "permission_config",
      "security_risk",
      "security_config",
      "third_party_integration",
      "consultation",
      "data_maintenance",
      "data_migration",
      "emergency_drill",
      "documentation",
      "data_security",
      "password_service_guarantee",
      "security_compliance",
      "consultation_assist",
      "routine_inspection",
      "other",
    ];
    const validSubPlatforms = [
      "platform_wide",
      "ai_data_service",
      "datav",
      "work_portal",
      "core_business_platform",
      "enterprise_tags",
      "staging_db",
      "data_sharing_platform",
      "data_archive_platform",
      "data_feedback",
      "data_exchange_platform",
      "data_open_platform",
      "data_catalog_platform",
      "data_report_platform",
      "data_governance_platform",
      "town_warehouse",
      "topic_db",
      "resource_view",
      "authorized_operation",
    ];
    const validDistricts = [
      "city_level",
      "development_zone",
      "liandu",
      "qingtian",
      "jinyun",
      "suichang",
      "songyang",
      "yunhe",
      "qingtian_county",
      "jingning",
      "longquan",
    ];

    if (b.status !== undefined && !validStatuses.includes(b.status as string)) {
      return jsonResponse(
        { error: `status 必须为 ${validStatuses.join("/")}` },
        400,
      );
    }

    if (
      b.taskType !== undefined &&
      !validTaskTypes.includes(b.taskType as string)
    ) {
      return jsonResponse(
        { error: `taskType 必须为 ${validTaskTypes.join("/")}` },
        400,
      );
    }

    const status = (b.status as string) ?? "todo";
    const taskType = (b.taskType as string) ?? "feature_optimization";
    const dueDate =
      b.dueDate !== undefined && typeof b.dueDate === "number"
        ? b.dueDate
        : undefined;
    const proposer =
      b.proposer !== undefined && typeof b.proposer === "string"
        ? b.proposer
        : undefined;
    const proposedAt =
      b.proposedAt !== undefined && typeof b.proposedAt === "number"
        ? b.proposedAt
        : undefined;
    const respondedAt =
      b.respondedAt !== undefined && typeof b.respondedAt === "number"
        ? b.respondedAt
        : undefined;
    const clientContact =
      b.clientContact !== undefined && typeof b.clientContact === "string"
        ? b.clientContact
        : undefined;

    if (
      b.subPlatform !== undefined &&
      typeof b.subPlatform === "string" &&
      !validSubPlatforms.includes(b.subPlatform)
    ) {
      return jsonResponse(
        { error: `subPlatform 必须为 ${validSubPlatforms.join("/")}` },
        400,
      );
    }

    const subPlatform =
      b.subPlatform !== undefined && typeof b.subPlatform === "string"
        ? b.subPlatform
        : "data_catalog_platform";

    if (
      b.district !== undefined &&
      typeof b.district === "string" &&
      !validDistricts.includes(b.district)
    ) {
      return jsonResponse(
        { error: `district 必须为 ${validDistricts.join("/")}` },
        400,
      );
    }

    const district =
      b.district !== undefined && typeof b.district === "string"
        ? b.district
        : "city_level";

    const startedAt =
      b.startedAt !== undefined && typeof b.startedAt === "number"
        ? b.startedAt
        : undefined;
    const completedAt =
      b.completedAt !== undefined && typeof b.completedAt === "number"
        ? b.completedAt
        : undefined;

    const progress =
      b.progress !== undefined && typeof b.progress === "number"
        ? Math.max(0, Math.min(100, b.progress))
        : undefined;

    const tags =
      b.tags !== undefined && Array.isArray(b.tags)
        ? b.tags.filter((t): t is string => typeof t === "string")
        : undefined;

    const notes =
      b.notes !== undefined && Array.isArray(b.notes)
        ? b.notes.filter((t): t is string => typeof t === "string")
        : undefined;

    const taskId = await ctx.runMutation(internal.tasks.createViaApi, {
      title: b.title.trim(),
      description: typeof b.description === "string" ? b.description : "",
      status: status as "backlog" | "todo" | "in_progress" | "done",
      taskType: taskType as any,
      projectId,
      dueDate,
      proposer,
      proposedAt,
      respondedAt,
      clientContact,
      subPlatform,
      district,
      startedAt,
      completedAt,
      progress,
      tags,
      notes,
    });

    return jsonResponse(
      {
        id: taskId,
        title: b.title,
        status,
        taskType,
        subPlatform,
        district,
        progress,
        tags,
        notes,
      },
      201,
    );
  }),
});

http.route({
  pathPrefix: "/api/tasks/",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const authResult = await authenticate(ctx, req);
    if (authResult instanceof Response) return authResult;
    const projectId = authResult;

    const segments = parsePathSegments(req);
    const taskId = segments[3];
    if (!taskId) {
      return jsonResponse({ error: "无效的任务 ID" }, 400);
    }

    if (segments.length > 4) {
      return jsonResponse({ error: "未找到路由" }, 404);
    }

    const taskResult = await getTaskSafely(ctx, taskId, projectId);
    if (taskResult instanceof Response) return taskResult;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "无效的 JSON 请求体" }, 400);
    }

    if (typeof body !== "object" || body === null) {
      return jsonResponse({ error: "请求体必须是 JSON 对象" }, 400);
    }

    const b = body as Record<string, unknown>;

    const validStatuses = ["backlog", "todo", "in_progress", "done"];
    const validTaskTypes = [
      "feature_optimization",
      "bug_handling",
      "incident_handling",
      "server_config",
      "permission_config",
      "security_risk",
      "security_config",
      "third_party_integration",
      "consultation",
      "data_maintenance",
      "data_migration",
      "emergency_drill",
      "documentation",
      "data_security",
      "password_service_guarantee",
      "security_compliance",
      "consultation_assist",
      "routine_inspection",
      "other",
    ];
    const validSubPlatforms = [
      "platform_wide",
      "ai_data_service",
      "datav",
      "work_portal",
      "core_business_platform",
      "enterprise_tags",
      "staging_db",
      "data_sharing_platform",
      "data_archive_platform",
      "data_feedback",
      "data_exchange_platform",
      "data_open_platform",
      "data_catalog_platform",
      "data_report_platform",
      "data_governance_platform",
      "town_warehouse",
      "topic_db",
      "resource_view",
      "authorized_operation",
    ];
    const validDistricts = [
      "city_level",
      "development_zone",
      "liandu",
      "qingtian",
      "jinyun",
      "suichang",
      "songyang",
      "yunhe",
      "qingtian_county",
      "jingning",
      "longquan",
    ];

    if (b.status !== undefined && !validStatuses.includes(b.status as string)) {
      return jsonResponse(
        { error: `status 必须为 ${validStatuses.join("/")}` },
        400,
      );
    }

    if (
      b.taskType !== undefined &&
      !validTaskTypes.includes(b.taskType as string)
    ) {
      return jsonResponse(
        { error: `taskType 必须为 ${validTaskTypes.join("/")}` },
        400,
      );
    }

    if (
      b.subPlatform !== undefined &&
      typeof b.subPlatform === "string" &&
      !validSubPlatforms.includes(b.subPlatform)
    ) {
      return jsonResponse(
        { error: `subPlatform 必须为 ${validSubPlatforms.join("/")}` },
        400,
      );
    }

    if (
      b.district !== undefined &&
      typeof b.district === "string" &&
      !validDistricts.includes(b.district)
    ) {
      return jsonResponse(
        { error: `district 必须为 ${validDistricts.join("/")}` },
        400,
      );
    }

    const updates: Record<string, unknown> = {};
    if (b.title !== undefined) updates.title = b.title;
    if (b.description !== undefined) updates.description = b.description;
    if (b.status !== undefined) updates.status = b.status;
    if (b.taskType !== undefined) updates.taskType = b.taskType;
    if (b.dueDate !== undefined) updates.dueDate = b.dueDate || undefined;
    if (b.proposer !== undefined) updates.proposer = b.proposer;
    if (b.proposedAt !== undefined)
      updates.proposedAt = b.proposedAt || undefined;
    if (b.respondedAt !== undefined)
      updates.respondedAt = b.respondedAt || undefined;
    if (b.clientContact !== undefined) updates.clientContact = b.clientContact;
    if (b.subPlatform !== undefined) updates.subPlatform = b.subPlatform;
    if (b.district !== undefined) updates.district = b.district;
    if (b.startedAt !== undefined) updates.startedAt = b.startedAt || undefined;
    if (b.completedAt !== undefined)
      updates.completedAt = b.completedAt || undefined;
    if (b.progress !== undefined) {
      if (typeof b.progress !== "number") {
        return jsonResponse({ error: "progress 必须为数字" }, 400);
      }
      updates.progress = Math.max(0, Math.min(100, b.progress));
    }
    if (b.tags !== undefined) {
      if (!Array.isArray(b.tags)) {
        return jsonResponse({ error: "tags 必须为数组" }, 400);
      }
      updates.tags = b.tags.filter((t): t is string => typeof t === "string");
    }
    if (b.notes !== undefined) {
      if (!Array.isArray(b.notes)) {
        return jsonResponse({ error: "notes 必须为数组" }, 400);
      }
      updates.notes = b.notes.filter((t): t is string => typeof t === "string");
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: "至少需要提供一个更新字段" }, 400);
    }

    await ctx.runMutation(internal.tasks.updateViaApi, {
      taskId: taskId as Id<"tasks">,
      title: updates.title as string | undefined,
      description: updates.description as string | undefined,
      status: updates.status as
        | "backlog"
        | "todo"
        | "in_progress"
        | "done"
        | undefined,
      taskType: updates.taskType as any,
      dueDate: updates.dueDate as number | undefined,
      proposer: updates.proposer as string | undefined,
      proposedAt: updates.proposedAt as number | undefined,
      respondedAt: updates.respondedAt as number | undefined,
      clientContact: updates.clientContact as string | undefined,
      subPlatform: updates.subPlatform as string | undefined,
      district: updates.district as string | undefined,
      startedAt: updates.startedAt as number | undefined,
      completedAt: updates.completedAt as number | undefined,
      progress: updates.progress as number | undefined,
      tags: updates.tags as string[] | undefined,
      notes: updates.notes as string[] | undefined,
    });

    return jsonResponse({ id: taskId, ...updates });
  }),
});

http.route({
  pathPrefix: "/api/tasks/",
  method: "DELETE",
  handler: httpAction(async (ctx, req) => {
    const authResult = await authenticate(ctx, req);
    if (authResult instanceof Response) return authResult;
    const projectId = authResult;

    const segments = parsePathSegments(req);

    if (segments.length === 6 && segments[4] === "attachments") {
      const taskId = segments[3];
      const attachmentId = segments[5];

      if (!taskId || !attachmentId) {
        return jsonResponse({ error: "无效的 ID" }, 400);
      }

      const taskResult = await getTaskSafely(ctx, taskId, projectId);
      if (taskResult instanceof Response) return taskResult;

      const attachmentResult = await getAttachmentSafely(
        ctx,
        attachmentId,
        taskId as Id<"tasks">,
      );
      if (attachmentResult instanceof Response) return attachmentResult;

      await ctx.runMutation(internal.attachments.removeViaApi, {
        attachmentId: attachmentId as Id<"taskAttachments">,
      });

      return jsonResponse({ id: attachmentId, deleted: true });
    }

    const taskId = segments[3];
    if (!taskId) {
      return jsonResponse({ error: "无效的任务 ID" }, 400);
    }

    if (segments.length > 4) {
      return jsonResponse({ error: "未找到路由" }, 404);
    }

    const taskResult = await getTaskSafely(ctx, taskId, projectId);
    if (taskResult instanceof Response) return taskResult;

    await ctx.runMutation(internal.tasks.deleteViaApi, {
      taskId: taskId as Id<"tasks">,
    });

    return jsonResponse({ id: taskId, deleted: true });
  }),
});

http.route({
  pathPrefix: "/api/tasks/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const segments = parsePathSegments(req);

    if (segments.length === 5 && segments[4] === "attachments") {
      const taskId = segments[3];
      if (!taskId) {
        return jsonResponse({ error: "无效的任务 ID" }, 400);
      }

      const authResult = await authenticate(ctx, req);
      if (authResult instanceof Response) return authResult;
      const projectId = authResult;

      const taskResult = await getTaskSafely(ctx, taskId, projectId);
      if (taskResult instanceof Response) return taskResult;

      const attachments = await ctx.runQuery(
        internal.attachments.listByTaskViaApi,
        { taskId: taskId as Id<"tasks"> },
      );
      return jsonResponse({ attachments });
    }

    return jsonResponse({ error: "未找到路由" }, 404);
  }),
});

http.route({
  pathPrefix: "/api/tasks/",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const segments = parsePathSegments(req);

    if (
      segments.length === 6 &&
      segments[4] === "attachments" &&
      segments[5] === "upload-url"
    ) {
      const taskId = segments[3];
      if (!taskId) {
        return jsonResponse({ error: "无效的任务 ID" }, 400);
      }

      const authResult = await authenticate(ctx, req);
      if (authResult instanceof Response) return authResult;
      const projectId = authResult;

      const taskResult = await getTaskSafely(ctx, taskId, projectId);
      if (taskResult instanceof Response) return taskResult;

      const uploadUrl = await ctx.runMutation(
        internal.attachments.generateUploadUrlViaApi,
        {},
      );
      return jsonResponse({ uploadUrl });
    }

    if (segments.length === 5 && segments[4] === "attachments") {
      const taskId = segments[3];
      if (!taskId) {
        return jsonResponse({ error: "无效的任务 ID" }, 400);
      }

      const authResult = await authenticate(ctx, req);
      if (authResult instanceof Response) return authResult;
      const projectId = authResult;

      const taskResult = await getTaskSafely(ctx, taskId, projectId);
      if (taskResult instanceof Response) return taskResult;

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "无效的 JSON 请求体" }, 400);
      }

      if (typeof body !== "object" || body === null) {
        return jsonResponse({ error: "请求体必须是 JSON 对象" }, 400);
      }

      const b = body as Record<string, unknown>;
      if (typeof b.storageId !== "string") {
        return jsonResponse({ error: "storageId 为必填字段" }, 400);
      }
      if (typeof b.fileName !== "string" || !b.fileName.trim()) {
        return jsonResponse({ error: "fileName 为必填字段" }, 400);
      }
      if (typeof b.fileSize !== "number") {
        return jsonResponse({ error: "fileSize 为必填字段" }, 400);
      }
      if (typeof b.fileType !== "string") {
        return jsonResponse({ error: "fileType 为必填字段" }, 400);
      }

      const attachmentId = await ctx.runMutation(
        internal.attachments.createViaApi,
        {
          taskId: taskId as Id<"tasks">,
          storageId: b.storageId as Id<"_storage">,
          fileName: b.fileName.trim(),
          fileSize: b.fileSize,
          fileType: b.fileType,
        },
      );

      return jsonResponse(
        {
          id: attachmentId,
          fileName: b.fileName,
          fileSize: b.fileSize,
          fileType: b.fileType,
        },
        201,
      );
    }

    return jsonResponse({ error: "未找到路由" }, 404);
  }),
});

export default http;
