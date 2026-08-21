"use client";

import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteResumeVersion, setDefaultResumeVersion } from "@/lib/actions/resumes";

export type ResumeVersionRow = {
  id: string;
  name: string;
  fileUrl: string | null;
  targetTrack: string | null;
  isDefault: boolean;
  createdAt: string;
};

export function ResumeList({ resumes }: { resumes: ResumeVersionRow[] }) {
  async function handleDelete(id: string) {
    try {
      await deleteResumeVersion(id);
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultResumeVersion(id);
      toast.success("已设为默认简历");
    } catch {
      toast.error("设置失败");
    }
  }

  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
        <FileText className="size-8 text-muted-foreground/50" />
        <span className="text-sm">还没有简历版本，先添加一个吧</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {resumes.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-start justify-between gap-2 pt-6">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{r.name}</p>
                {r.isDefault && <Badge>默认</Badge>}
              </div>
              {r.targetTrack && (
                <p className="text-sm text-muted-foreground">
                  目标方向：{r.targetTrack}
                </p>
              )}
              {r.fileUrl && (
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  查看文件
                </a>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!r.isDefault && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetDefault(r.id)}
                >
                  设为默认
                </Button>
              )}
              <ConfirmDeleteButton
                trigger={
                  <Button size="sm" variant="ghost">
                    删除
                  </Button>
                }
                title={`确定删除简历版本「${r.name}」吗？`}
                onConfirm={() => handleDelete(r.id)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
