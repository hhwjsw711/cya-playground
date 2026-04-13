import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">
          任务流
        </h1>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
          团队任务管理
        </p>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
            {flow === "signIn" ? "登录" : "注册账号"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              const formData = new FormData(e.currentTarget);
              signIn("password", formData)
                .catch(() => {
                  setError(
                    flow === "signIn"
                      ? "邮箱或密码错误"
                      : "注册失败，请尝试其他邮箱",
                  );
                })
                .finally(() => setLoading(false));
            }}
            className="flex flex-col gap-3"
          >
            {flow === "signUp" && (
              <input
                name="name"
                placeholder="姓名"
                type="text"
                required
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <input
              name="email"
              placeholder="邮箱"
              type="email"
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="password"
              placeholder="密码"
              type="password"
              required
              minLength={8}
              className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input name="flow" type="hidden" value={flow} />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition-colors"
            >
              {loading ? "..." : flow === "signIn" ? "登录" : "注册"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError("");
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {flow === "signIn" ? "没有账号？立即注册" : "已有账号？立即登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
