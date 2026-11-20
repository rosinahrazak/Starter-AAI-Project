// Server-side checks every protected page and action runs (design rule 7).
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getSessionPayload, type Role } from "./session";

// Cached per render pass; the user row is fetched fresh from the database so
// the role in the cookie is never trusted on its own.
export const requireUser = cache(async () => {
  const payload = await getSessionPayload();
  if (!payload) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  // Cookie signed but the user no longer exists → logged out.
  if (!user) redirect("/login");
  return user;
});

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect("/unauthorised");
  return user;
}
