"use client";

import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteResumeVersion } from "@/lib/actions/resumes";

export type ResumeVersionRow = {
  id: string;
  name: string;
  fileUrl: string | null;
  targetTrack: string | null;
  createdAt: string;
};

export function ResumeList({ resumes }: { resumes: ResumeVersionRow[] }) {
  async function handleDelete(id: string) {
    if (!confirm("确定删除该简历版本吗？")) return;
    try {
      await deleteResumeVersion(id);
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  }

  if (resumes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        还没有简历版本，先添加一个吧
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {resumes.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-start justify-between gap-2 pt-6">
            <div>
              <p className="font-medium">{r.name}</p>
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
            <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
              删除
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
