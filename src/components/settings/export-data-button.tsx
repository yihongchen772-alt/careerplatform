"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { exportMyData } from "@/lib/actions/export-data";

export function ExportDataButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const result = await exportMyData();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const payload = JSON.stringify(result.data);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `求职罗盘备份-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("导出完成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导出失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>导出我的数据</CardTitle>
        <CardDescription>
          把你在这里的岗位、投递记录、简历版本、日程、联系人、题库、模拟面试等全部数据打包成一个 JSON
          文件下载下来，自己留一份备份。这个文件也能直接导入桌面版（本地单机版）的"恢复备份"，把网页版的数据搬到桌面版上用。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={handleExport} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Download />}
          {loading ? "导出中…" : "导出为 JSON"}
        </Button>
      </CardContent>
    </Card>
  );
}
