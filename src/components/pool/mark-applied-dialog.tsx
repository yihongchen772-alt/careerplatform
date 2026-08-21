"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { markPositionApplied } from "@/lib/actions/positions";

type ResumeOption = { id: string; name: string };

export function MarkAppliedDialog({
  positionId,
  positionLabel,
  resumeVersions,
  open,
  onOpenChange,
}: {
  positionId: string;
  positionLabel: string;
  resumeVersions: ResumeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [appliedDate, setAppliedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [referrer, setReferrer] = useState("");
  const [resumeVersionId, setResumeVersionId] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await markPositionApplied(positionId, {
        appliedDate: new Date(appliedDate),
        referrer: referrer || undefined,
        resumeVersionId: resumeVersionId || undefined,
      });
      toast.success("已标记为投递，投递记录已生成");
      onOpenChange(false);
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>标记为已投递</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{positionLabel}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">投递日期</Label>
            <Input
              type="date"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">内推人（可选）</Label>
            <Input value={referrer} onChange={(e) => setReferrer(e.target.value)} />
          </div>
          {resumeVersions.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">使用的简历版本</Label>
              <Select
                value={resumeVersionId}
                onValueChange={(value) => setResumeVersionId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择简历版本（可选）">
                    {(value: string) =>
                      resumeVersions.find((r) => r.id === value)?.name ??
                      "选择简历版本（可选）"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {resumeVersions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "确认投递"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
