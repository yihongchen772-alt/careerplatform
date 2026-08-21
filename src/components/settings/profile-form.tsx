"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/lib/actions/account";

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string | null;
    school: string | null;
    targetTrack: string | null;
    graduationYear: number | null;
  };
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [school, setSchool] = useState(initial.school ?? "");
  const [targetTrack, setTargetTrack] = useState(initial.targetTrack ?? "");
  const [graduationYear, setGraduationYear] = useState(
    initial.graduationYear?.toString() ?? ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        name: name || undefined,
        school: school || undefined,
        targetTrack: targetTrack || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
      });
      toast.success("已保存");
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">昵称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">学校</Label>
              <Input value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">求职方向</Label>
              <Input
                value={targetTrack}
                onChange={(e) => setTargetTrack(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">毕业年份</Label>
              <Input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : "保存资料"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
