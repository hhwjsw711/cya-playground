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
请求体示例：{ "title": "任务标题", "subPlatform": "platform_wide", "district": "city_level", "taskType": "feature_optimization", "status": "todo", "documentLinks": [{ "docType": "需求单", "docNumber": "HXYW-REQ-20260205-001" }] }

各字段说明：
- title（string，必填）：任务标题
- subPlatform（string，所属子平台）：platform_wide(公共数据平台) / ai_data_service(AI数据服务) / datav(DataV) / work_portal(工作门户) / core_business_platform(核心业务平台) / enterprise_tags(企业标签) / staging_db(前置库) / data_sharing_platform(数据共享平台) / data_archive_platform(数据归档平台) / data_feedback(数据回流) / data_exchange_platform(数据交换平台) / data_open_platform(数据开放平台) / data_catalog_platform(数据目录平台，默认) / data_report_platform(数据上报平台) / data_governance_platform(数据治理平台) / town_warehouse(镇街数仓) / topic_db(专题库) / resource_view(资源视窗)
- district（string，所属区县）：city_level(市本级) / development_zone(开发区) / liandu(莲都区) / qingtian(青田县) / jinyun(缙云县) / suichang(遂昌县) / songyang(松阳县) / yunhe(云和县) / qingtian_county(庆元县) / jingning(景宁县) / longquan(龙泉市)
- progress（number，0-100）：任务进度百分比
- documentLinks（array，可选）：关联文档数组，[{ "docType": "需求单", "docNumber": "HXYW-REQ-20260205-001" }]
- docType（string）：文档类型：demand_form(需求单) / update_form(更新单) / bug_report(Bug分析报告) / incident_report(故障分析报告) / security_confirm(安全风险处置确认单) / permission_form(权限申请表) / cloud_resource_form(云资源申请表)
- docNumber（string）：文档编号，如 HXYW-REQ-20260205-001
- taskType（string，任务类型）：feature_optimization(功能优化) / bug_handling(Bug处置) / incident_handling(故障处理) / server_config(服务器配置) / permission_config(权限配置) / security_risk(安全风险) / security_config(安全配置) / third_party_integration(三方对接) / consultation(咨询协助) / data_maintenance(数据维护统计) / documentation(文档编写)
- status（string，状态）：backlog(未排期) / todo(未开始) / in_progress(进行中) / done(已完成)
- description（string，可选）：任务描述
- dueDate（number，可选）：计划完成时间，Unix 时间戳（毫秒）
- proposer（string，可选）：提出人姓名
- proposedAt（number，可选）：提出时间，Unix 时间戳（毫秒）
- respondedAt（number，可选）：响应时间，Unix 时间戳（毫秒）
- clientContact（string，可选）：甲方对接人姓名
- startedAt（number，可选）：实际开始时间，Unix 时间戳（毫秒）
- completedAt（number，可选）：实际完成时间，Unix 时间戳（毫秒）
- tags（array，可选）：备注数组，如 ["bug分析报告缺失"]
- notes（array，可选）：情况说明数组，如 ["已联系客户"]

### 更新任务
PATCH ${baseUrl}/:taskId
Content-Type: application/json
请求体：至少提供一个字段，如 { "status": "done" }
可更新字段：title / description / status / taskType / dueDate / proposer / proposedAt / respondedAt / clientContact / subPlatform / district / progress / tags / notes / documentLinks / startedAt / completedAt

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
                      <td className="py-0.5">计划完成时间（Unix 时间戳）</td>
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
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">subPlatform</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        platform_wide（公共数据平台） / ai_data_service / datav
                        / work_portal / core_business_platform / enterprise_tags
                        / staging_db / data_sharing_platform /
                        data_archive_platform / data_feedback /
                        data_exchange_platform / data_open_platform /
                        data_catalog_platform（默认） / data_report_platform /
                        data_governance_platform / town_warehouse / topic_db /
                        resource_view
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">district</td>
                      <td className="pr-4 py-0.5">string</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        city_level（市本级） / development_zone（开发区） /
                        liandu / qingtian / jinyun / suichang / songyang / yunhe
                        / qingtian_county / jingning / longquan
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">progress</td>
                      <td className="pr-4 py-0.5">number</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">任务进度（0-100）</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">documentLinks</td>
                      <td className="pr-4 py-0.5">array</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        关联文档数组（如
                        &#123;"docType":"需求单","docNumber":"HXYW-REQ-20260205-001"&#125;）
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">tags</td>
                      <td className="pr-4 py-0.5">array</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        备注数组（如 &#91;"bug分析报告缺失"&#93;）
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">notes</td>
                      <td className="pr-4 py-0.5">array</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">
                        情况说明数组（如 &#91;"已联系客户"&#93;）
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">startedAt</td>
                      <td className="pr-4 py-0.5">number</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">开始时间（Unix 时间戳）</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 font-mono">completedAt</td>
                      <td className="pr-4 py-0.5">number</td>
                      <td className="pr-4 py-0.5">否</td>
                      <td className="py-0.5">结束时间（Unix 时间戳）</td>
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
                proposer / proposedAt / respondedAt / clientContact /
                subPlatform / district / startedAt / completedAt /
                progress，至少提供一个
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
          </div>
        </div>
      </div>
    </div>
  );
}
