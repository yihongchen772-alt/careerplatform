import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/request-user";

/**
 * The signed-in user's full row. The desktop build's requireUser() returns the
 * whole row and pages read profile/settings columns straight off it, so the
 * cloud build has to match that shape, not just the JWT's id/email.
 * Cached per request because a layout and its page both call this.
 */
export const requireUser = cache(async () => {
  const id = requestUser.getStore() ?? (await auth())?.user?.id;
  if (!id) redirect("/login");

  // A valid JWT can outlive its row (account deleted), hence the second check.
  const user = await db.user.findUnique({ where: { id }, omit: { passwordHash: true } });
  if (!user) redirect("/login");
  return user;
});
