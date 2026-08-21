"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Send } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGE_BADGE_VARIANT, STAGE_LABELS } from "@/lib/stage-labels";
import { daysSince, isTerminalStage } from "@/lib/reminders";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { ApplicationStage } from "@prisma/client";

export type ApplicationRow = {
  id: string;
  title: string;
  appliedDate: string;
  currentStage: ApplicationStage;
  currentStageDate: string;
  referrer: string | null;
  source: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  company: { name: string };
};

export function ApplicationsTable({
  applications,
}: {
  applications: ApplicationRow[];
}) {
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  const filtered = useMemo(
    () =>
      stageFilter === "ALL"
        ? applications
        : applications.filter((a) => a.currentStage === stageFilter),
    [applications, stageFilter]
  );

  function handleExport() {
    const csv = toCsv(filtered, [
      { header: "公司", value: (a) => a.company.name },
      { header: "岗位", value: (a) => a.title },
      { header: "投递日期", value: (a) => new Date(a.appliedDate).toLocaleDateString() },
      { header: "当前状态", value: (a) => STAGE_LABELS[a.currentStage] },
      { header: "距上次更新(天)", value: (a) => daysSince(new Date(a.currentStageDate)) },
      { header: "渠道", value: (a) => a.source ?? "" },
      { header: "内推人", value: (a) => a.referrer ?? "" },
      { header: "薪资下限(K)", value: (a) => a.salaryMin ?? "" },
      { header: "薪资上限(K)", value: (a) => a.salaryMax ?? "" },
    ]);
    downloadCsv(`投递记录_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">按状态筛选：</span>
          <Select
            value={stageFilter}
            onValueChange={(value) => setStageFilter(value ?? "ALL")}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {(value: string) =>
                  value === "ALL" ? "全部" : STAGE_LABELS[value as ApplicationStage]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                <SelectItem key={stage} value={stage}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download />
          导出 CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>公司 / 岗位</TableHead>
            <TableHead>投递日期</TableHead>
            <TableHead>当前状态</TableHead>
            <TableHead>距上次更新</TableHead>
            <TableHead>渠道</TableHead>
            <TableHead>内推人</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((app) => {
            const stale = daysSince(new Date(app.currentStageDate));
            const terminal = isTerminalStage(app.currentStage);
            return (
              <TableRow key={app.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/applications/${app.id}`} className="block">
                    <div className="font-medium">{app.company.name}</div>
                    <div className="text-sm text-muted-foreground">{app.title}</div>
                  </Link>
                </TableCell>
                <TableCell>
                  {new Date(app.appliedDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={STAGE_BADGE_VARIANT[app.currentStage]}>
                    {STAGE_LABELS[app.currentStage]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      !terminal && stale >= 14 ? "text-destructive font-medium" : ""
                    }
                  >
                    {stale} 天
                  </span>
                </TableCell>
                <TableCell>{app.source ?? "-"}</TableCell>
                <TableCell>{app.referrer ?? "-"}</TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Send className="size-8 text-muted-foreground/50" />
                  <span>暂无投递记录</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
