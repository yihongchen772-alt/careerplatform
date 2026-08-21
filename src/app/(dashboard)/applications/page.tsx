import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { AddApplicationDialog } from "@/components/applications/add-application-dialog";
import { ApplicationsTable } from "@/components/applications/applications-table";

export default async function ApplicationsPage() {
  const user = await requireUser();

  const applications = await db.application.findMany({
    where: { userId: user.id },
    include: { company: true },
    orderBy: { appliedDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">投递记录</h1>
        <AddApplicationDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ApplicationsTable
            applications={applications.map((a) => ({
              ...a,
              appliedDate: a.appliedDate.toISOString(),
              currentStageDate: a.currentStageDate.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
