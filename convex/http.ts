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
    const validPriorities = ["low", "medium", "high", "urgent"];

    if (b.status !== undefined && !validStatuses.includes(b.status as string)) {
      return jsonResponse(
        { error: `status 必须为 ${validStatuses.join("/")}` },
        400,
      );
    }

    if (
      b.priority !== undefined &&
      !validPriorities.includes(b.priority as string)
    ) {
      return jsonResponse(
        { error: `priority 必须为 ${validPriorities.join("/")}` },
        400,
      );
    }

    const status = (b.status as string) ?? "todo";
    const priority = (b.priority as string) ?? "medium";
    const dueDate =
      b.dueDate !== undefined && typeof b.dueDate === "number"
        ? b.dueDate
        : undefined;

    const taskId = await ctx.runMutation(internal.tasks.createViaApi, {
      title: b.title.trim(),
      description: typeof b.description === "string" ? b.description : "",
      status: status as "backlog" | "todo" | "in_progress" | "done",
      priority: priority as "low" | "medium" | "high" | "urgent",
      projectId,
      dueDate,
    });

    return jsonResponse({ id: taskId, title: b.title, status, priority }, 201);
  }),
});

http.route({
  pathPrefix: "/api/tasks/",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const authResult = await authenticate(ctx, req);
    if (authResult instanceof Response) return authResult;
    const projectId = authResult;

    const taskId = new URL(req.url).pathname.split("/").pop() as Id<"tasks">;
    if (!taskId) {
      return jsonResponse({ error: "无效的任务 ID" }, 400);
    }

    const task = await ctx.runQuery(internal.tasks.getTaskById, { taskId });
    if (!task || task.projectId !== projectId) {
      return jsonResponse({ error: "任务不存在或不属于该项目" }, 404);
    }

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
    const validPriorities = ["low", "medium", "high", "urgent"];

    if (b.status !== undefined && !validStatuses.includes(b.status as string)) {
      return jsonResponse(
        { error: `status 必须为 ${validStatuses.join("/")}` },
        400,
      );
    }

    if (
      b.priority !== undefined &&
      !validPriorities.includes(b.priority as string)
    ) {
      return jsonResponse(
        { error: `priority 必须为 ${validPriorities.join("/")}` },
        400,
      );
    }

    const updates: Record<string, unknown> = {};
    if (b.title !== undefined) updates.title = b.title;
    if (b.description !== undefined) updates.description = b.description;
    if (b.status !== undefined) updates.status = b.status;
    if (b.priority !== undefined) updates.priority = b.priority;
    if (b.dueDate !== undefined) updates.dueDate = b.dueDate;

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: "至少需要提供一个更新字段" }, 400);
    }

    await ctx.runMutation(internal.tasks.updateViaApi, {
      taskId,
      title: updates.title as string | undefined,
      description: updates.description as string | undefined,
      status: updates.status as
        | "backlog"
        | "todo"
        | "in_progress"
        | "done"
        | undefined,
      priority: updates.priority as
        | "low"
        | "medium"
        | "high"
        | "urgent"
        | undefined,
      dueDate: updates.dueDate as number | undefined,
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

    const taskId = new URL(req.url).pathname.split("/").pop() as Id<"tasks">;
    if (!taskId) {
      return jsonResponse({ error: "无效的任务 ID" }, 400);
    }

    const task = await ctx.runQuery(internal.tasks.getTaskById, { taskId });
    if (!task || task.projectId !== projectId) {
      return jsonResponse({ error: "任务不存在或不属于该项目" }, 404);
    }

    await ctx.runMutation(internal.tasks.deleteViaApi, { taskId });

    return jsonResponse({ id: taskId, deleted: true });
  }),
});

export default http;
