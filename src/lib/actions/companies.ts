"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { companyDirectoryEntrySchema } from "@/lib/validation";
import { z } from "zod";

export async function addCompanyDirectoryEntry(
  input: z.infer<typeof companyDirectoryEntrySchema>
) {
  const user = await requireUser();
  const data = companyDirectoryEntrySchema.parse(input);

  const existing = await db.company.findUnique({ where: { name: data.name } });

  if (existing) {
    await db.company.update({
      where: { id: existing.id },
      data: {
        careerUrl: existing.careerUrl ?? data.careerUrl,
        sector: existing.sector ?? data.sector,
        industry: existing.industry ?? data.industry,
      },
    });
  } else {
    await db.company.create({
      data: {
        name: data.name,
        careerUrl: data.careerUrl,
        sector: data.sector,
        industry: data.industry,
        verified: false,
        addedByUserId: user.id,
      },
    });
  }

  revalidatePath("/companies");
}

/**
 * Company is one table shared by every account, so a rename is only allowed
 * while nobody else has a record there; otherwise one person's tidy-up would
 * change the name on everyone's board.
 */
async function ownsCompanyAlone(companyId: string, userId: string): Promise<boolean> {
  const others = await db.application.count({ where: { companyId, userId: { not: userId } } })
    + await db.position.count({ where: { companyId, userId: { not: userId } } });
  if (others > 0) return false;
  return (await db.application.count({ where: { companyId, userId } })) + (await db.position.count({ where: { companyId, userId } })) > 0;
}

/** Rename companies whose names carry leftovers. The old name stays as an alias, so mail signed with it still matches. */
export async function tidyCompanyNames(pairs: { from: string; to: string }[]) {
  const user = await requireUser();
  const rows = z.array(z.object({ from: z.string().min(1).max(200), to: z.string().min(2).max(200) })).max(100).parse(pairs);
  const done: { from: string; to: string }[] = [];
  for (const pair of rows) {
    const company = await db.company.findUnique({ where: { name: pair.from }, select: { id: true } });
    if (!company || (await db.company.findUnique({ where: { name: pair.to }, select: { id: true } }))) continue;
    if (!(await ownsCompanyAlone(company.id, user.id))) continue;
    await db.$transaction(async (tx) => {
      await tx.company.update({ where: { id: company.id }, data: { name: pair.to } });
      if (!(await tx.companyAlias.findUnique({ where: { alias: pair.from } }))) await tx.companyAlias.create({ data: { companyId: company.id, alias: pair.from } });
    });
    done.push(pair);
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return done;
}

export async function undoTidyCompanyNames(pairs: { from: string; to: string }[]) {
  const user = await requireUser();
  const rows = z.array(z.object({ from: z.string().min(1).max(200), to: z.string().min(2).max(200) })).max(100).parse(pairs);
  for (const pair of rows) {
    const company = await db.company.findUnique({ where: { name: pair.to }, select: { id: true } });
    if (!company || !(await ownsCompanyAlone(company.id, user.id))) continue;
    await db.$transaction(async (tx) => {
      await tx.companyAlias.deleteMany({ where: { companyId: company.id, alias: pair.from } });
      await tx.company.update({ where: { id: company.id }, data: { name: pair.from } });
    });
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}
