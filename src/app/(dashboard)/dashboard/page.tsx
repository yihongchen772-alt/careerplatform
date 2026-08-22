import Link from "next/link";
import { Clock, Send, Trophy, XCircle, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildTodos, type Todo } from "@/lib/todos";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/stage-labels";

export default async function DashboardPage() {
  const user = await requireUser();

  const [applications, positions, stageHistories] = await Promise.all([
    db.application.findMany({
      where: { userId: user.id },
      include: { company: true },
      orderBy: { appliedDate: "desc" },
    }),
    db.position.findMany({
      where: { userId: user.id, status: { not: "APPLIED" } },
      include: { company: true },
    }),
    db.stageHistory.findMany({
      where: { application: { userId: user.id }, nextDeadline: { not: null } },
      include: { application: { include: { company: true } } },
    }),
  ]);

  const total = applications.length;
  const offers = applications.filter((a) => a.currentStage === "OFFER" || a.currentStage === "ACCEPTED").length;
  const rejected = applications.filter((a) => a.currentStage === "REJECTED" || a.currentStage === "DECLINED").length;
  const inProgress = total - offers - rejected;

  const stageCounts = STAGE_ORDER.map((stage) => ({
    stage,
    count: applications.filter((a) => a.currentStage === stage).length,
  }));
  const maxCount = Math.max(1, ...stageCounts.map((s) => s.count));

  const todos = buildTodos(applications, positions, stageHistories);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">总览</h1>

      <TodoCard todos={todos} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="总投递数" value={total} icon={Send} />
        <StatCard label="进行中" value={inProgress} icon={Clock} />
        <StatCard label="Offer" value={offers} icon={Trophy} accent />
        <StatCard label="已结束" value={rejected} icon={XCircle} muted />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>漏斗分布</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {stageCounts.map(({ stage, count }) => (
            <div key={stage} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 truncate text-xs text-muted-foreground sm:w-24 sm:text-sm">
                {STAGE_LABELS[stage]}
              </span>
              <div className="h-5 flex-1 rounded-sm bg-muted">
                <div
                  className="h-5 rounded-r-sm bg-primary transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-medium">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}

const URGENCY_STYLE: Record<Todo["urgency"], { badge: string; label: string }> = {
  overdue: { badge: "destructive", label: "已逾期" },
  urgent: { badge: "destructive", label: "很急" },
  soon: { badge: "secondary", label: "临近" },
};

function TodoCard({ todos }: { todos: Todo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>待办</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            暂时没有要处理的事，保持住
          </p>
        ) : (
          <>
            {todos.map((todo) => {
              const style = URGENCY_STYLE[todo.urgency];
              return (
                <Link
                  key={todo.id}
                  href={todo.href}
                  className="flex flex-col gap-1 rounded-md border p-2 text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{todo.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {todo.sublabel}
                    </p>
                  </div>
                  <Badge
                    variant={
                      style.badge as "destructive" | "secondary"
                    }
                    className="self-start sm:self-auto"
                  >
                    {style.label}
                  </Badge>
                </Link>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              处理完对应记录（更新阶段、标记已投）后，这里会自动消失
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  muted,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <Card>
      {/* Icon sits above the number on narrow screens; side-by-side would squeeze
          the label into one-character-per-line vertical text. */}
      <CardContent className="flex flex-col-reverse items-start gap-2 pt-6 sm:flex-row sm:justify-between sm:gap-0">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold">{value}</p>
        </div>
        <div
          className={
            "flex size-9 shrink-0 items-center justify-center rounded-md " +
            (accent
              ? "bg-primary/10 text-primary"
              : muted
                ? "bg-muted text-muted-foreground/70"
                : "bg-muted text-muted-foreground")
          }
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
