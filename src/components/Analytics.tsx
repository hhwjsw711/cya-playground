import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const STATUS_COLORS = ["#94a3b8", "#60a5fa", "#f59e0b", "#34d399"];
const PRIORITY_COLORS = ["#ef4444", "#f97316", "#eab308", "#94a3b8"];

export function Analytics({ projectId }: { projectId: Id<"projects"> }) {
  const stats = useQuery(api.analytics.getProjectStats, { projectId });

  if (stats === undefined) {
    return <div className="text-slate-500 py-12 text-center">加载中...</div>;
  }

  if (stats === null) {
    return <div className="text-slate-500 py-12 text-center">无权限查看</div>;
  }

  return (
    <div>
      {stats.truncated && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          任务数超过 500，统计数据可能不完整。
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="总任务数"
          value={stats.totalTasks}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label="完成率"
          value={`${stats.completionRate}%`}
          subtext={`${stats.doneTasks} / ${stats.totalTasks}`}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          label="平均周期"
          value={stats.avgCycleDays > 0 ? `${stats.avgCycleDays} 天` : "--"}
          color="text-violet-600 dark:text-violet-400"
          bg="bg-violet-50 dark:bg-violet-900/20"
        />
        <StatCard
          label="逾期任务"
          value={stats.overdueTasks}
          color={
            stats.overdueTasks > 0
              ? "text-red-600 dark:text-red-400"
              : "text-slate-600 dark:text-slate-400"
          }
          bg={
            stats.overdueTasks > 0
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-slate-50 dark:bg-slate-700/50"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="任务状态分布">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                label={({ name, value }) =>
                  value > 0 ? `${name} ${value}` : ""
                }
              >
                {stats.statusDistribution.map(
                  (_: { name: string; value: number }, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[i]} />
                  ),
                )}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="近 14 天完成趋势">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={stats.dailyCompletion.map((d) => ({
                ...d,
                date: new Date(d.date).toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                }),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="完成数"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="优先级分布">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={stats.priorityDistribution}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={36}
              />
              <Tooltip />
              <Bar dataKey="value" name="任务数" radius={[0, 4, 4, 0]}>
                {stats.priorityDistribution.map(
                  (_: { name: string; value: number }, i: number) => (
                    <Cell key={i} fill={PRIORITY_COLORS[i]} />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="任务类型分布">
          {stats.taskTypeDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-sm text-slate-400">
              暂无类型数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.taskTypeDistribution}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name="任务数"
                  fill="#818cf8"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="成员工作量">
          {stats.assigneeWorkload.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-sm text-slate-400">
              暂无分配数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={stats.assigneeWorkload}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={60}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="任务数"
                  fill="#60a5fa"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${bg}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
