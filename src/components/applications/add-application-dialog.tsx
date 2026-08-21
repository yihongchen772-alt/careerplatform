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
  DialogTrigger,
} from "@/components/ui/dialog";
import { createApplication } from "@/lib/actions/applications";
import {
  LAST_REFERRER_KEY,
  LAST_SOURCE_KEY,
  rememberValue,
  recallValue,
} from "@/lib/remembered-values";

export function AddApplicationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [appliedDate, setAppliedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [referrer, setReferrer] = useState(() => recallValue(LAST_REFERRER_KEY));
  const [source, setSource] = useState(() => recallValue(LAST_SOURCE_KEY));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !title) {
      toast.error("公司名称和岗位名称必填");
      return;
    }
    setLoading(true);
    try {
      await createApplication({
        companyName,
        title,
        appliedDate: new Date(appliedDate),
        referrer: referrer || undefined,
        source: source || undefined,
      });
      rememberValue(LAST_REFERRER_KEY, referrer);
      rememberValue(LAST_SOURCE_KEY, source);
      toast.success("已新增投递记录");
      setCompanyName("");
      setTitle("");
      setOpen(false);
    } catch {
      toast.error("新增失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ 新增投递记录</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增投递记录</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">公司名称 *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">岗位名称 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">渠道</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="官网 / 内推 / 猎头..."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
