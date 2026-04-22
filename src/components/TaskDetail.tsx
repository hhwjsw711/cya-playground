import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useToast } from "./Toast";

type Member = {
  _id: Id<"projectMembers">;
  userId: Id<"users">;
  userName: string;
  userEmail: string;
  role: "admin" | "editor" | "viewer";
  projectId: Id<"projects">;
  _creationTime: number;
};

const TASK_TYPE_OPTIONS = [
  { value: "feature_optimization", label: "功能优化" },
  { value: "bug_handling", label: "Bug处置" },
  { value: "incident_handling", label: "故障处理" },
  { value: "server_config", label: "服务器配置" },
  { value: "permission_config", label: "权限配置" },
  { value: "security_risk", label: "安全风险" },
  { value: "security_config", label: "安全配置" },
  { value: "third_party_integration", label: "三方对接" },
  { value: "consultation", label: "咨询协助" },
  { value: "data_maintenance", label: "数据维护统计" },
  { value: "documentation", label: "文档编写" },
] as const;

type TaskType = (typeof TASK_TYPE_OPTIONS)[number]["value"];

const SUB_PLATFORM_OPTIONS = [
  { value: "platform_wide", label: "公共数据平台" },
  { value: "ai_data_service", label: "AI数据服务" },
  { value: "datav", label: "DataV" },
  { value: "work_portal", label: "工作门户" },
  { value: "core_business_platform", label: "核心业务平台" },
  { value: "enterprise_tags", label: "企业标签" },
  { value: "staging_db", label: "前置库" },
  { value: "data_sharing_platform", label: "数据共享平台" },
  { value: "data_archive_platform", label: "数据归档平台" },
  { value: "data_feedback", label: "数据回流" },
  { value: "data_exchange_platform", label: "数据交换平台" },
  { value: "data_open_platform", label: "数据开放平台" },
  { value: "data_catalog_platform", label: "数据目录平台" },
  { value: "data_report_platform", label: "数据上报平台" },
  { value: "data_governance_platform", label: "数据治理平台" },
  { value: "town_warehouse", label: "镇街数仓" },
  { value: "topic_db", label: "专题库" },
  { value: "resource_view", label: "资源视窗" },
];

const DISTRICT_OPTIONS = [
  { value: "city_level", label: "市本级" },
  { value: "development_zone", label: "开发区" },
  { value: "liandu", label: "莲都区" },
  { value: "qingtian", label: "青田县" },
  { value: "jinyun", label: "缙云县" },
  { value: "suichang", label: "遂昌县" },
  { value: "songyang", label: "松阳县" },
  { value: "yunhe", label: "云和县" },
  { value: "qingtian_county", label: "庆元县" },
  { value: "jingning", label: "景宁县" },
  { value: "longquan", label: "龙泉市" },
];

const DISTRICT_LABELS: Record<string, string> = Object.fromEntries(
  DISTRICT_OPTIONS.map((opt) => [opt.value, opt.label]),
);

const DOC_TYPE_OPTIONS = [
  { value: "demand_form", label: "需求单" },
  { value: "update_form", label: "更新单" },
  { value: "bug_report", label: "Bug分析报告" },
  { value: "incident_report", label: "故障分析报告" },
  { value: "security_confirm", label: "安全风险处置确认单" },
  { value: "permission_form", label: "权限申请表" },
  { value: "cloud_resource_form", label: "云资源申请表" },
] as const;

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOC_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]),
);

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return "< 1 天";
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days} 天 ${remainHours} 小时` : `${days} 天`;
}

function formatDurationMinutes(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainMinutes = minutes % 60;
    return remainMinutes > 0
      ? `${hours} 小时 ${remainMinutes} 分钟`
      : `${hours} 小时`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days} 天 ${remainHours} 小时` : `${days} 天`;
}

function formatDateMinute(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timestampToDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timestampToDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function TaskDetail({
  taskId,
  members,
  onClose,
  onStatusChange,
  userRole,
}: {
  taskId: Id<"tasks">;
  members: Member[];
  onClose: () => void;
  onStatusChange: (status: "backlog" | "todo" | "in_progress" | "done") => void;
  userRole?: "admin" | "editor" | "viewer";
}) {
  const task = useQuery(api.tasks.get, { taskId });
  const comments = useQuery(api.comments.listByTask, { taskId });
  const updateTask = useMutation(api.tasks.update);
  const addComment = useMutation(api.comments.create);
  const deleteComment = useMutation(api.comments.remove);
  const deleteTask = useMutation(api.tasks.remove);

  const { addToast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [newDocType, setNewDocType] = useState("");
  const [newDocNumber, setNewDocNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [editingReq, setEditingReq] = useState(false);
  const [reqProposer, setReqProposer] = useState("");
  const [reqClientContact, setReqClientContact] = useState("");
  const [reqProposedAt, setReqProposedAt] = useState("");
  const [reqRespondedAt, setReqRespondedAt] = useState("");
  const [reqDistrict, setReqDistrict] = useState("");

  const canEdit = userRole === "admin" || userRole === "editor";
  const [mountedAt] = useState(() => Date.now());

  if (!task) {
    return null;
  }

  const hasReqInfo =
    task.proposer ||
    task.clientContact ||
    task.proposedAt ||
    task.respondedAt ||
    task.district;

  const isOverdue =
    task.status !== "done" && task.dueDate && task.dueDate < mountedAt;

  const startEditReq = () => {
    setReqProposer(task.proposer ?? "");
    setReqClientContact(task.clientContact ?? "");
    setReqProposedAt(
      task.proposedAt ? timestampToDatetimeLocal(task.proposedAt) : "",
    );
    setReqRespondedAt(
      task.respondedAt ? timestampToDatetimeLocal(task.respondedAt) : "",
    );
    setReqDistrict(task.district ?? "city_level");
    setEditingReq(true);
  };

  const saveReq = () => {
    updateTask({
      taskId,
      proposer: reqProposer,
      clientContact: reqClientContact,
      proposedAt: reqProposedAt ? new Date(reqProposedAt).getTime() : 0,
      respondedAt: reqRespondedAt ? new Date(reqRespondedAt).getTime() : 0,
      district: reqDistrict,
    })
      .then(() => setEditingReq(false))
      .catch((err: Error) => addToast(err.message));
  };

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center pt-4 sm:pt-16 px-3 sm:px-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            {isEditing ? (
              <div className="flex-1 mr-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xl font-bold px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full mt-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      updateTask({
                        taskId,
                        title: editTitle,
                        description: editDescription,
                      })
                        .then(() => setIsEditing(false))
                        .catch((err: Error) => addToast(err.message));
                    }}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 mr-4">
                <h2 className="text-xl font-bold">{task.title}</h2>
                {task.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                子平台
              </label>
              <select
                value={task.subPlatform ?? "data_catalog_platform"}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    subPlatform: e.target.value,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUB_PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                任务类型
              </label>
              <select
                value={task.taskType ?? "feature_optimization"}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    taskType: e.target.value as TaskType,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                乙方责任人
              </label>
              <select
                value={task.assigneeId ?? ""}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    assigneeId: e.target.value
                      ? (e.target.value as Id<"users">)
                      : undefined,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">未指派</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                进度{" "}
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {task.progress ?? 0}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={task.progress ?? 0}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    progress: Number(e.target.value),
                  }).catch((err: Error) => addToast(err.message));
                }}
                disabled={!canEdit}
                className="w-full h-1.5 accent-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">状态</label>
              <select
                value={task.status}
                onChange={(e) =>
                  onStatusChange(
                    e.target.value as
                      | "backlog"
                      | "todo"
                      | "in_progress"
                      | "done",
                  )
                }
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">未排期</option>
                <option value="todo">未开始</option>
                <option value="in_progress">进行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                计划完成时间
              </label>
              <input
                type="date"
                value={task.dueDate ? timestampToDateInput(task.dueDate) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateTask({
                    taskId,
                    dueDate: val
                      ? new Date(val + "T00:00:00Z").getTime()
                      : undefined,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                实际开始时间
              </label>
              <input
                type="date"
                value={
                  task.startedAt ? timestampToDateInput(task.startedAt) : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  updateTask({
                    taskId,
                    startedAt: val
                      ? new Date(val + "T00:00:00Z").getTime()
                      : undefined,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                实际完成时间
              </label>
              <input
                type="date"
                value={
                  task.completedAt ? timestampToDateInput(task.completedAt) : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  updateTask({
                    taskId,
                    completedAt: val
                      ? new Date(val + "T00:00:00Z").getTime()
                      : undefined,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mb-4">
            {!isEditing && (
              <button
                onClick={() => {
                  setEditTitle(task.title);
                  setEditDescription(task.description);
                  setIsEditing(true);
                }}
                className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
              >
                编辑
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("确认删除该任务？")) {
                  deleteTask({ taskId })
                    .then(() => onClose())
                    .catch((err: Error) => addToast(err.message));
                }
              }}
              className="px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm transition-colors"
            >
              删除
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                需求信息
              </h3>
              {canEdit && !editingReq && (
                <button
                  onClick={startEditReq}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {hasReqInfo ? "编辑" : "补充"}
                </button>
              )}
            </div>
            {editingReq ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      所属区县
                    </label>
                    <select
                      value={reqDistrict}
                      onChange={(e) => setReqDistrict(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DISTRICT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      提出人
                    </label>
                    <input
                      type="text"
                      value={reqProposer}
                      onChange={(e) => setReqProposer(e.target.value)}
                      placeholder="输入姓名"
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      甲方对接人
                    </label>
                    <input
                      type="text"
                      value={reqClientContact}
                      onChange={(e) => setReqClientContact(e.target.value)}
                      placeholder="输入姓名"
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      提出时间
                    </label>
                    <input
                      type="datetime-local"
                      value={reqProposedAt}
                      onChange={(e) => setReqProposedAt(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      响应时间
                    </label>
                    <input
                      type="datetime-local"
                      value={reqRespondedAt}
                      onChange={(e) => setReqRespondedAt(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div></div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveReq}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingReq(false)}
                    className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : hasReqInfo ? (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {task.district && (
                    <span>
                      所属{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {DISTRICT_LABELS[task.district] ?? task.district}
                      </span>
                    </span>
                  )}
                  {task.proposer && (
                    <span>
                      提出人{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {task.proposer}
                      </span>
                    </span>
                  )}
                  {task.clientContact && (
                    <span>
                      甲方对接人{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {task.clientContact}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {task.proposedAt && (
                    <span>提出时间 {formatDateMinute(task.proposedAt)}</span>
                  )}
                  {task.respondedAt && (
                    <span>
                      响应时间 {formatDateMinute(task.respondedAt)}
                      {task.proposedAt &&
                        task.respondedAt > task.proposedAt && (
                          <span className="text-blue-500 ml-1">
                            （耗时{" "}
                            {formatDurationMinutes(
                              task.respondedAt - task.proposedAt,
                            )}
                            ）
                          </span>
                        )}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">暂无</p>
            )}
          </div>

          {(task.startedAt || task.completedAt || task.dueDate) && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mb-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {task.dueDate && (
                  <span>
                    计划完成时间：
                    {new Date(task.dueDate).toLocaleDateString("zh-CN")}
                    {isOverdue && (
                      <span className="ml-1 text-red-500 font-medium">
                        （已逾期）
                      </span>
                    )}
                  </span>
                )}
                <span>
                  状态：
                  {task.status === "backlog"
                    ? "未排期"
                    : task.status === "todo"
                      ? "未开始"
                      : task.status === "in_progress"
                        ? "进行中"
                        : "已完成"}
                </span>
                {task.startedAt && (
                  <span>
                    实际开始时间：
                    {new Date(task.startedAt).toLocaleDateString("zh-CN")}
                  </span>
                )}
                {task.completedAt && (
                  <span>
                    实际完成时间：
                    {new Date(task.completedAt).toLocaleDateString("zh-CN")}
                    {task.dueDate && task.completedAt > task.dueDate && (
                      <span className="ml-1 text-red-500">
                        （逾期 {formatDuration(task.completedAt - task.dueDate)}
                        ）
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="font-semibold mb-3">
              关联文档 ({task.documentLinks?.length ?? 0})
            </h3>
            <div className="space-y-2 mb-3">
              {task.documentLinks?.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md"
                >
                  <span className="text-sm">
                    {DOC_TYPE_LABELS[link.docType] ?? link.docType}
                  </span>
                  <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                    {link.docNumber}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => {
                        const newLinks = (task.documentLinks ?? []).filter(
                          (_, i) => i !== idx,
                        );
                        updateTask({ taskId, documentLinks: newLinks }).catch(
                          (err: Error) => addToast(err.message),
                        );
                      }}
                      className="ml-auto text-xs text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              {(!task.documentLinks || task.documentLinks.length === 0) && (
                <p className="text-sm text-slate-400">暂无关联文档</p>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择文档类型</option>
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newDocNumber}
                  onChange={(e) => setNewDocNumber(e.target.value)}
                  placeholder="文档编号"
                  className="flex-1 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (!newDocType || !newDocNumber.trim()) return;
                    const newLinks = [
                      ...(task.documentLinks ?? []),
                      { docType: newDocType, docNumber: newDocNumber.trim() },
                    ];
                    updateTask({ taskId, documentLinks: newLinks })
                      .then(() => {
                        setNewDocType("");
                        setNewDocNumber("");
                      })
                      .catch((err: Error) => addToast(err.message));
                  }}
                  disabled={!newDocType || !newDocNumber.trim()}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="font-semibold mb-3">
              情况说明 ({comments?.length ?? 0}
              {(comments?.length ?? 0) >= 100 ? "+" : ""})
            </h3>
            <div className="space-y-3 mb-4">
              {comments?.map((comment) => (
                <div
                  key={comment._id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {comment.authorName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(comment._creationTime).toLocaleDateString(
                          "zh-CN",
                        )}
                      </span>
                      <button
                        onClick={() => {
                          deleteComment({ commentId: comment._id }).catch(
                            (err: Error) => addToast(err.message),
                          );
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {comment.content}
                  </p>
                </div>
              ))}
              {comments?.length === 0 && (
                <p className="text-sm text-slate-400">暂无情况说明</p>
              )}
              {(comments?.length ?? 0) >= 100 && (
                <p className="text-xs text-slate-400">
                  仅显示最近 100 条情况说明。
                </p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                addComment({ taskId, content: commentText })
                  .then(() => setCommentText(""))
                  .catch((err: Error) => addToast(err.message));
              }}
              className="flex gap-2"
            >
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="添加情况说明..."
                className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                发送
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
