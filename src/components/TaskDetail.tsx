import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef } from "react";
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours} 小时`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days} 天 ${remainHours} 小时` : `${days} 天`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const attachments = useQuery(api.attachments.listByTask, { taskId });
  const updateTask = useMutation(api.tasks.update);
  const addComment = useMutation(api.comments.create);
  const deleteComment = useMutation(api.comments.remove);
  const deleteTask = useMutation(api.tasks.remove);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const createAttachment = useMutation(api.attachments.create);
  const removeAttachment = useMutation(api.attachments.remove);

  const { addToast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = userRole === "admin" || userRole === "editor";

  if (!task) {
    return null;
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          addToast(`文件 ${file.name} 超过 20MB 限制`);
          continue;
        }

        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          addToast(`上传 ${file.name} 失败`);
          continue;
        }

        const { storageId } = (await result.json()) as {
          storageId: Id<"_storage">;
        };
        await createAttachment({
          taskId,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

          <div className="flex flex-wrap gap-3 mb-6">
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
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">未排期</option>
                <option value="todo">未开始</option>
                <option value="in_progress">进行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                优先级
              </label>
              <select
                value={task.priority}
                onChange={(e) => {
                  updateTask({
                    taskId,
                    priority: e.target.value as
                      | "low"
                      | "medium"
                      | "high"
                      | "urgent",
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                负责人
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
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                截止日期
              </label>
              <input
                type="date"
                value={
                  task.dueDate
                    ? new Date(task.dueDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  updateTask({
                    taskId,
                    dueDate: val
                      ? new Date(val + "T23:59:59").getTime()
                      : undefined,
                  }).catch((err: Error) => addToast(err.message));
                }}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="ml-auto flex gap-2 self-end">
              {!isEditing && (
                <button
                  onClick={() => {
                    setEditTitle(task.title);
                    setEditDescription(task.description);
                    setIsEditing(true);
                  }}
                  className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors"
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
                className="px-3 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm transition-colors"
              >
                删除
              </button>
            </div>
          </div>

          {(task.startedAt || task.completedAt || task.dueDate) && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mb-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {task.dueDate && (
                  <span>
                    截止：{new Date(task.dueDate).toLocaleDateString("zh-CN")}
                    {task.status !== "done" && task.dueDate < Date.now() && (
                      <span className="ml-1 text-red-500 font-medium">
                        （已逾期）
                      </span>
                    )}
                  </span>
                )}
                {task.startedAt && (
                  <span>
                    开始：{formatDateTime(task.startedAt)}
                    {task.completedAt && (
                      <span className="ml-2">
                        耗时：
                        {formatDuration(task.completedAt - task.startedAt)}
                      </span>
                    )}
                    {!task.completedAt && task.status === "in_progress" && (
                      <span className="ml-2">
                        已进行：{formatDuration(Date.now() - task.startedAt)}
                      </span>
                    )}
                  </span>
                )}
                {task.completedAt && (
                  <span>
                    完成：{formatDateTime(task.completedAt)}
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
              附件 ({attachments?.length ?? 0})
            </h3>
            {attachments && attachments.length > 0 ? (
              <div className="space-y-2 mb-4">
                {attachments.map((att) => (
                  <div
                    key={att._id}
                    className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                  >
                    <svg
                      className="w-5 h-5 text-slate-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {att.fileName}
                        </a>
                      ) : (
                        <span className="text-sm truncate block">
                          {att.fileName}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatFileSize(att.fileSize)} · {att.uploadedBy} ·{" "}
                        {new Date(att.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => {
                          if (confirm(`确认删除附件 ${att.fileName}？`)) {
                            removeAttachment({ attachmentId: att._id }).catch(
                              (err: Error) => addToast(err.message),
                            );
                          }
                        }}
                        className="text-xs text-red-500 hover:underline shrink-0"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-4">暂无附件</p>
            )}
            {canEdit && (
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    void handleFileUpload(e.target.files);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors disabled:opacity-50"
                >
                  {uploading ? "上传中..." : "上传附件"}
                </button>
                <span className="text-xs text-slate-400 ml-2">最大 20MB</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="font-semibold mb-3">
              评论 ({comments?.length ?? 0}
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
                <p className="text-sm text-slate-400">暂无评论</p>
              )}
              {(comments?.length ?? 0) >= 100 && (
                <p className="text-xs text-slate-400">
                  仅显示最近 100 条评论。
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
                placeholder="添加评论..."
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
