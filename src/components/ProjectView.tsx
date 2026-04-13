import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { TaskDetail } from "./TaskDetail";
import { ApiPanel } from "./ApiPanel";
import { useToast } from "./Toast";

const STATUS_COLUMNS = [
  { key: "backlog" as const, label: "待规划" },
  { key: "todo" as const, label: "待办" },
  { key: "in_progress" as const, label: "进行中" },
  { key: "done" as const, label: "已完成" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

export function ProjectView({
  projectId,
  onBack,
}: {
  projectId: Id<"projects">;
  onBack: () => void;
}) {
  const project = useQuery(api.projects.get, { projectId });
  const tasks = useQuery(api.tasks.listByProject, { projectId });
  const members = useQuery(api.members.listByProject, { projectId });
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const addMember = useMutation(api.members.add);
  const updateMemberRole = useMutation(api.members.updateRole);
  const removeMember = useMutation(api.members.remove);
  const { addToast } = useToast();

  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<
    "backlog" | "todo" | "in_progress" | "done"
  >("todo");
  const [showMembers, setShowMembers] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<
    "admin" | "editor" | "viewer"
  >("editor");

  if (project === undefined || tasks === undefined) {
    return <div className="text-slate-500">加载中...</div>;
  }

  if (project === null) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">项目不存在</p>
        <button
          onClick={onBack}
          className="text-blue-600 hover:underline text-sm"
        >
          返回项目列表
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="返回项目列表"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{project.name}</h1>
          </div>
        </div>
        {project.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 ml-11">
            {project.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 ml-11">
          <button
            onClick={() => {
              setShowMembers(!showMembers);
              setShowApi(false);
            }}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${showMembers ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"}`}
          >
            成员 ({members?.length ?? 0})
          </button>
          <button
            onClick={() => {
              setShowApi(!showApi);
              setShowMembers(false);
            }}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${showApi ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"}`}
          >
            API
          </button>
          {project.role !== "viewer" && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              新建任务
            </button>
          )}
        </div>
      </div>

      {showApi && <ApiPanel projectId={projectId} />}

      {showMembers && members && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">成员</h3>
            {project.role === "admin" && !showAddMemberForm && (
              <button
                onClick={() => setShowAddMemberForm(true)}
                className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
              >
                添加成员
              </button>
            )}
          </div>

          {showAddMemberForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMember({
                  projectId,
                  email: newMemberEmail,
                  role: newMemberRole,
                })
                  .then(() => {
                    setNewMemberEmail("");
                    setShowAddMemberForm(false);
                  })
                  .catch((err: Error) => addToast(err.message));
              }}
              className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex flex-col sm:flex-row gap-2 sm:items-end"
            >
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">
                  邮箱
                </label>
                <input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="输入邮箱地址"
                  type="email"
                  required
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  角色
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) =>
                    setNewMemberRole(e.target.value as typeof newMemberRole)
                  }
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">管理员</option>
                  <option value="editor">可编辑</option>
                  <option value="viewer">可查看</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                添加
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberForm(false);
                  setNewMemberEmail("");
                }}
                className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
              >
                取消
              </button>
            </form>
          )}

          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-1"
              >
                <span className="truncate">
                  {m.userName}{" "}
                  <span className="text-slate-400">({m.userEmail})</span>
                </span>
                <div className="flex items-center gap-2">
                  {project.role === "admin" ? (
                    <select
                      value={m.role}
                      onChange={(e) => {
                        updateMemberRole({
                          memberId: m._id,
                          role: e.target.value as "admin" | "editor" | "viewer",
                        }).catch((err: Error) => addToast(err.message));
                      }}
                      className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">管理员</option>
                      <option value="editor">可编辑</option>
                      <option value="viewer">可查看</option>
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">
                      {m.role === "admin"
                        ? "管理员"
                        : m.role === "editor"
                          ? "可编辑"
                          : "可查看"}
                    </span>
                  )}
                  {project.role === "admin" && (
                    <button
                      onClick={() => {
                        if (confirm(`确认移除成员 ${m.userName}？`)) {
                          removeMember({ memberId: m._id }).catch(
                            (err: Error) => addToast(err.message),
                          );
                        }
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))}
            {members.length >= 100 && (
              <p className="text-xs text-slate-400 mt-2">
                仅显示前 100 位成员。
              </p>
            )}
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">新建任务</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTask({
                title: newTaskTitle,
                description: "",
                status: newTaskStatus,
                priority: "medium",
                projectId,
              })
                .then(() => {
                  setNewTaskTitle("");
                  setShowCreateForm(false);
                })
                .catch((err: Error) => addToast(err.message));
            }}
            className="flex flex-col sm:flex-row gap-3 sm:items-end"
          >
            <div className="flex-1">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="任务标题"
                required
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={newTaskStatus}
              onChange={(e) =>
                setNewTaskStatus(e.target.value as typeof newTaskStatus)
              }
              className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_COLUMNS.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              创建
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
            >
              取消
            </button>
          </form>
        </div>
      )}

      {tasks && tasks.length >= 200 && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          仅显示前 200 个任务，部分任务可能未显示。
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const columnTasks = (tasks ?? []).filter((t) => t.status === col.key);
          return (
            <div key={col.key}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {col.label}
                </h3>
                <span className="text-xs text-slate-400">
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <button
                    key={task._id}
                    onClick={() => setSelectedTaskId(task._id)}
                    className="w-full text-left p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <p className="text-sm font-medium mb-2">{task.title}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] ?? ""}`}
                      >
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </span>
                      {task.assigneeName && (
                        <span className="text-xs text-slate-400">
                          {task.assigneeName}
                        </span>
                      )}
                      {task.hasComments && (
                        <span className="text-xs text-slate-400 ml-auto">
                          💬
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          members={members ?? []}
          onClose={() => setSelectedTaskId(null)}
          onStatusChange={(status) => {
            updateTask({ taskId: selectedTaskId, status }).catch((err: Error) =>
              addToast(err.message),
            );
          }}
          userRole={project?.role}
        />
      )}
    </div>
  );
}
