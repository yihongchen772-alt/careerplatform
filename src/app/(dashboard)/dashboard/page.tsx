import Link from "next/link";
import { Clock, Send, Trophy, XCircle, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  findStaleApplications,
  findUpcomingPositionDeadlines,
} from "@/lib/reminders";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/stage-labels";

export default async function DashboardPage() {
  const user = await requireUser();

  const [applications, positions] = await Promise.all([
    db.application.findMany({
      where: { userId: user.id },
      include: { company: true },
      orderBy: { appliedDate: "desc" },
    }),
    db.position.findMany({
      where: { userId: user.id, status: { not: "APPLIED" } },
      include: { company: true },
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

  const stale = findStaleApplications(applications);
  const upcoming = findUpcomingPositionDeadlines(positions);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">总览</h1>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>停滞投递（超 14 天无更新）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stale.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无需要跟进的投递</p>
            )}
            {stale.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
              >
                <span>
                  {app.companyName} · {app.title}
                </span>
                <Badge variant="destructive">{app.daysStale} 天未更新</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>即将截止的候选岗位</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无 5 天内截止的岗位</p>
            )}
            {upcoming.map((p) => (
              <Link
                key={p.id}
                href="/pool"
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
              >
                <span>
                  {p.companyName} · {p.title}
                </span>
                <Badge variant="secondary">{p.daysLeft} 天后截止</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
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
