"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";
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
import { MarkAppliedDialog } from "@/components/pool/mark-applied-dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deletePosition } from "@/lib/actions/positions";
import { POSITION_STATUS_LABELS } from "@/lib/stage-labels";
import { daysUntil } from "@/lib/reminders";
import type { PositionStatus } from "@prisma/client";

export type PoolPosition = {
  id: string;
  title: string;
  track: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  interestScore: number | null;
  deadline: string | null;
  status: PositionStatus;
  company: { name: string };
};

type ResumeOption = { id: string; name: string };

export function PoolTable({
  positions,
  resumeVersions,
}: {
  positions: PoolPosition[];
  resumeVersions: ResumeOption[];
}) {
  const [markingId, setMarkingId] = useState<string | null>(null);
  const sorted = useMemo(
    () =>
      [...positions].sort(
        (a, b) => (b.interestScore ?? -1) - (a.interestScore ?? -1)
      ),
    [positions]
  );
  const marking = sorted.find((p) => p.id === markingId);

  async function handleDelete(id: string) {
    try {
      await deletePosition(id);
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>公司 / 岗位</TableHead>
            <TableHead>方向</TableHead>
            <TableHead>地点</TableHead>
            <TableHead>薪资</TableHead>
            <TableHead>综合得分</TableHead>
            <TableHead>截止日期</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => {
            const deadline = p.deadline ? new Date(p.deadline) : null;
            const daysLeft = deadline ? daysUntil(deadline) : null;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.company.name}</div>
                  <div className="text-sm text-muted-foreground">{p.title}</div>
                </TableCell>
                <TableCell>{p.track ?? "-"}</TableCell>
                <TableCell>{p.location ?? "-"}</TableCell>
                <TableCell>
                  {p.salaryMin || p.salaryMax
                    ? `${p.salaryMin ?? "?"}-${p.salaryMax ?? "?"}K`
                    : "-"}
                </TableCell>
                <TableCell>
                  {p.interestScore !== null ? (
                    <Badge>{p.interestScore}</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {deadline ? (
                    <span
                      className={
                        daysLeft !== null && daysLeft <= 5
                          ? "text-destructive font-medium"
                          : ""
                      }
                    >
                      {deadline.toLocaleDateString()}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {POSITION_STATUS_LABELS[p.status]}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {p.status !== "APPLIED" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMarkingId(p.id)}
                    >
                      标记已投
                    </Button>
                  )}
                  <ConfirmDeleteButton
                    trigger={
                      <Button size="sm" variant="ghost">
                        删除
                      </Button>
                    }
                    title={`确定删除 ${p.company.name} · ${p.title} 吗？`}
                    onConfirm={() => handleDelete(p.id)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <ListChecks className="size-8 text-muted-foreground/50" />
                  <span>候选池为空，先添加一个感兴趣的岗位吧</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {marking && (
        <MarkAppliedDialog
          positionId={marking.id}
          positionLabel={`${marking.company.name} · ${marking.title}`}
          resumeVersions={resumeVersions}
          open={!!markingId}
          onOpenChange={(open) => !open && setMarkingId(null)}
        />
      )}
    </>
  );
}
