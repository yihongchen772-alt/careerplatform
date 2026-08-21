import { requireUser } from "@/lib/session";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="w-56 shrink-0 border-r bg-card">
        <DashboardNav userLabel={user.name ?? user.email ?? ""} />
      </aside>
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
