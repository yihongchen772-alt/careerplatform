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
      <DashboardNav userLabel={user.name ?? user.email ?? ""} />
      {/* pt-14 clears the fixed mobile top bar; md drops it since the bar is hidden */}
      <main className="flex-1 overflow-x-hidden px-4 pt-18 pb-[env(safe-area-inset-bottom)] md:p-6">
        {children}
      </main>
    </div>
  );
}
