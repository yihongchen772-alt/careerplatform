import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { AddPositionDialog } from "@/components/pool/add-position-dialog";
import { PoolTable } from "@/components/pool/pool-table";

export default async function PoolPage() {
  const user = await requireUser();

  const [positions, resumeVersions] = await Promise.all([
    db.position.findMany({
      where: { userId: user.id },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    db.resumeVersion.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">候选岗位池</h1>
        <AddPositionDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <PoolTable
            positions={positions.map((p) => ({
              ...p,
              deadline: p.deadline?.toISOString() ?? null,
            }))}
            resumeVersions={resumeVersions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
