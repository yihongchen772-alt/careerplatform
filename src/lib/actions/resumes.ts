"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { resumeVersionSchema } from "@/lib/validation";
import { z } from "zod";

export async function createResumeVersion(
  input: z.infer<typeof resumeVersionSchema>
) {
  const user = await requireUser();
  const data = resumeVersionSchema.parse(input);

  await db.resumeVersion.create({
    data: {
      userId: user.id,
      name: data.name,
      fileUrl: data.fileUrl,
      targetTrack: data.targetTrack,
    },
  });

  revalidatePath("/resumes");
}

export async function deleteResumeVersion(id: string) {
  const user = await requireUser();
  await db.resumeVersion.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/resumes");
}

export async function setDefaultResumeVersion(id: string) {
  const user = await requireUser();
  const target = await db.resumeVersion.findFirst({
    where: { id, userId: user.id },
  });
  if (!target) throw new Error("未找到该简历版本");

  await db.$transaction([
    db.resumeVersion.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    db.resumeVersion.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/resumes");
  revalidatePath("/pool");
}
