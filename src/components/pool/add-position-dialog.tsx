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
import { createPosition } from "@/lib/actions/positions";

const emptyForm = {
  companyName: "",
  title: "",
  track: "",
  location: "",
  salaryMin: "",
  salaryMax: "",
  jdUrl: "",
  source: "",
  deadline: "",
  techFit: "5",
  salary: "5",
  location_score: "5",
  growth: "5",
};

export function AddPositionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName || !form.title) {
      toast.error("公司名称和岗位名称必填");
      return;
    }
    setLoading(true);
    try {
      await createPosition({
        companyName: form.companyName,
        title: form.title,
        track: form.track || undefined,
        location: form.location || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        jdUrl: form.jdUrl || undefined,
        source: form.source || undefined,
        deadline: form.deadline ? new Date(form.deadline) : undefined,
        scoreBreakdown: {
          techFit: Number(form.techFit),
          salary: Number(form.salary),
          location: Number(form.location_score),
          growth: Number(form.growth),
        },
      });
      toast.success("已添加到候选池");
      setForm(emptyForm);
      setOpen(false);
    } catch {
      toast.error("添加失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ 添加候选岗位</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加候选岗位</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="公司名称 *">
              <Input
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                required
              />
            </Field>
            <Field label="岗位名称 *">
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
              />
            </Field>
            <Field label="方向">
              <Input
                value={form.track}
                onChange={(e) => set("track", e.target.value)}
                placeholder="后端 / 算法 / 产品..."
              />
            </Field>
            <Field label="地点">
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
            <Field label="薪资下限（K）">
              <Input
                type="number"
                value={form.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
              />
            </Field>
            <Field label="薪资上限（K）">
              <Input
                type="number"
                value={form.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
              />
            </Field>
            <Field label="渠道">
              <Input
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="官网 / 内推 / 猎头..."
              />
            </Field>
            <Field label="投递截止日期">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </Field>
          </div>
          <Field label="JD 链接">
            <Input
              value={form.jdUrl}
              onChange={(e) => set("jdUrl", e.target.value)}
            />
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">打分（0-10，权重：技术35% 薪资25% 地点20% 成长20%）</p>
            <div className="grid grid-cols-4 gap-2">
              <Field label="技术栈匹配">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.techFit}
                  onChange={(e) => set("techFit", e.target.value)}
                />
              </Field>
              <Field label="薪资">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </Field>
              <Field label="地点">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.location_score}
                  onChange={(e) => set("location_score", e.target.value)}
                />
              </Field>
              <Field label="成长性">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.growth}
                  onChange={(e) => set("growth", e.target.value)}
                />
              </Field>
            </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
