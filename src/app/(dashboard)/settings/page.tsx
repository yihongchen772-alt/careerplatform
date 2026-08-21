import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">账号设置</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm
          initial={{
            name: user.name,
            school: user.school,
            targetTrack: user.targetTrack,
            graduationYear: user.graduationYear,
          }}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
