import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useToast } from "./Toast";

const CONVEX_SITE_URL = (
  import.meta.env.VITE_CONVEX_SITE_URL as string
).replace(/\/$/, "");

const DEEPEEK_URL = "https://chat.deepseek.com";
const DOUBAO_URL = "https://www.doubao.com/chat";

function buildAiPrompt(baseUrl: string, apiKey: string) {
  return `你是一个任务管理助手。你可以通过以下 REST API 管理项目中的任务，请根据用户的指令调用对应的接口。

## 认证方式
所有请求需在 Header 中携带 API 密钥：
\`Authorization: Bearer ${apiKey}\`

## 接口列表

### 查询任务列表
GET ${baseUrl}
返回：{ "tasks": [...] }

### 创建任务
POST ${baseUrl}
Content-Type: application/json
请求体：{ "title": "任务标题", "description": "描述", "status": "todo", "taskType": "feature_optimization", "dueDate": null, "proposer": "提出人", "proposedAt": null, "respondedAt": null, "clientContact": "甲方对接人" }
- status 可选值：backlog / todo / in_progress / done
- taskType 可选值：feature_optimization / bug_handling / incident_handling / server_config / permission_config / security_risk / security_config / third_party_integration / consultation / data_maintenance / documentation
- dueDate 为 Unix 时间戳（毫秒），可选
- proposer 为提出人姓名，可选
- proposedAt 为提出时间（Unix 时间戳，毫秒），可选
- respondedAt 为响应时间（Unix 时间戳，毫秒），可选
- clientContact 为甲方对接人姓名，可选

### 更新任务
PATCH ${baseUrl}/:taskId
Content-Type: application/json
请求体：{ "status": "done" }（至少提供一个字段）
可更新字段：title / description / status / taskType / dueDate / proposer / proposedAt / respondedAt / clientContact

### 删除任务
DELETE ${baseUrl}/:taskId

## 注意事项
- 请先查询任务列表了解当前状态，再执行操作
- 执行操作后再次查询确认结果
- 所有操作都是实时的，请谨慎执行删除操作`;
}

export function ApiPanel({ projectId }: { projectId: Id<"projects"> }) {
  const project = useQuery(api.projects.get, { projectId });
  const regenerateApiKey = useMutation(api.projects.regenerateApiKey);
  const { addToast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  if (!project) return null;

  const isAdmin = project.role === "admin";
  const isEditor = project.role === "editor";
  const canViewKey = isAdmin || isEditor;
  const displayKey = canViewKey ? (apiKey ?? project.apiKey ?? null) : null;
  const baseUrl = `${CONVEX_SITE_URL}/api/tasks`;
  const aiPrompt = displayKey ? buildAiPrompt(baseUrl, displayKey) : null;

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <h3 className="font-semibold mb-4">API 接口</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">API 密钥</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            通过 API 密钥，外部系统可以管理项目中的任务。
          </p>
          {canViewKey ? (
            <>
              {displayKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-md text-xs font-mono break-all select-all">
                    {displayKey}
                  </code>
                  <button
                    onClick={() => handleCopy(displayKey)}
                    className="px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs transition-colors whitespace-nowrap"
                  >
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">尚未生成 API 密钥</p>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    if (
                      displayKey &&
                      !confirm("重新生成会使当前密钥立即失效，确认继续？")
                    )
                      return;
                    regenerateApiKey({ projectId })
                      .then((key) => {
                        setApiKey(key);
                        addToast(
                          displayKey ? "API 密钥已重新生成" : "API 密钥已生成",
                        );
                      })
                      .catch((err: Error) => addToast(err.message));
                  }}
                  className="mt-2 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                >
                  {displayKey ? "重新生成" : "生成密钥"}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">
              仅管理员和可编辑成员可查看 API 密钥
            </p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-sm font-medium mb-2">AI 助手</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            复制提示词后，前往 AI 平台粘贴发送，即可通过对话管理任务。
          </p>
          {aiPrompt ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(aiPrompt).then(() => {
                      setPromptCopied(true);
                      setTimeout(() => setPromptCopied(false), 2000);
                    });
                  }}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                >
                  {promptCopied ? "已复制提示词" : "复制提示词"}
                </button>
                <a
                  href={DEEPEEK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium transition-colors"
                >
                  打开 DeepSeek
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <a
                  href={DOUBAO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium transition-colors"
                >
                  打开豆包
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
              <details className="group">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-500 transition-colors">
                  预览提示词内容
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                  {aiPrompt}
                </pre>
              </details>
            </div>
          ) : (
            <p className="text-xs text-slate-400">请先生成 API 密钥</p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-sm font-medium mb-3">接口文档</h4>

          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                  GET
                </span>
                <code className="text-xs font-mono">{baseUrl}</code>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                查询任务列表
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                <pre>{`curl ${baseUrl} \\
  -H "Authorization: Bearer <api_key>"`}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                  POST
                </span>
                <code className="text-xs font-mono">{baseUrl}</code>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                创建新任务
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                <pre>{`curl -X POST ${baseUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <api_key>" \\
  -d '{
    "title": "新任务",
    "description": "任务描述",
    "status": "todo",
    "taskType": "feature_optimization"
  }'`}</pre>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pr-4 py-1">字段</th>
                      <th className="pr-4 py-1">类型</th>
                      <th className="pr-4 py-1">必填</th>
                      <th className="py-1">说明</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 dark:text-slate-400">
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">title</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">是</td>
                      <td className="py-0.5">任务标题</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">description</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">任务描述</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">status</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        backlog / todo / in_progress / done
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">taskType</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        feature_optimization / bug_handling / incident_handling
                        / server_config / permission_config / security_risk /
                        security_config / third_party_integration / consultation
                        / data_maintenance / documentation
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">dueDate</td>
                      <td className="pr-4 py-0.5">number</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">截止时间（Unix 时间戳）</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">proposer</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">提出人</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">proposedAt</td>
                      <td className="pr-4 py-0.5">number</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">提出时间（Unix 时间戳）</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">respondedAt</td>
                      <td className="pr-4 py-0.5">number</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">响应时间（Unix 时间戳）</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">clientContact</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">甲方对接人</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold">
                  PATCH
                </span>
                <code className="text-xs font-mono">{baseUrl}/:taskId</code>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                更新任务
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                <pre>{`curl -X PATCH ${baseUrl}/task_id \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <api_key>" \\
  -d '{
    "status": "done"
  }'`}</pre>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                可更新字段：title / description / status / taskType / dueDate /
                proposer / proposedAt / respondedAt /
                clientContact，至少提供一个
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">
                  DELETE
                </span>
                <code className="text-xs font-mono">{baseUrl}/:taskId</code>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                删除任务
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                <pre>{`curl -X DELETE ${baseUrl}/task_id \\
  -H "Authorization: Bearer <api_key>"`}</pre>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3">附件接口</h4>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                    GET
                  </span>
                  <code className="text-xs font-mono">
                    {baseUrl}/:taskId/attachments
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  查询任务附件列表
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`curl ${baseUrl}/task_id/attachments \\
  -H "Authorization: Bearer <api_key>"`}</pre>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                    POST
                  </span>
                  <code className="text-xs font-mono">
                    {baseUrl}/:taskId/attachments/upload-url
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  获取附件上传地址（第一步）
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`curl -X POST ${baseUrl}/task_id/attachments/upload-url \\
  -H "Authorization: Bearer <api_key>"`}</pre>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold">
                    上传
                  </span>
                  <code className="text-xs font-mono">
                    上传文件至 upload-url（第二步）
                  </code>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`curl -X POST "<upload_url>" \\
  -H "Content-Type: image/png" \\
  --data-binary @file.png`}</pre>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                    POST
                  </span>
                  <code className="text-xs font-mono">
                    {baseUrl}/:taskId/attachments
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  创建附件记录（第三步）
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`curl -X POST ${baseUrl}/task_id/attachments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <api_key>" \\
  -d '{
    "storageId": "<storage_id>",
    "fileName": "file.png",
    "fileSize": 12345,
    "fileType": "image/png"
  }'`}</pre>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">
                    DELETE
                  </span>
                  <code className="text-xs font-mono">
                    {baseUrl}/:taskId/attachments/:attachmentId
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  删除附件
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 text-xs font-mono overflow-x-auto">
                  <pre>{`curl -X DELETE ${baseUrl}/task_id/attachments/attachment_id \\
  -H "Authorization: Bearer <api_key>"`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
