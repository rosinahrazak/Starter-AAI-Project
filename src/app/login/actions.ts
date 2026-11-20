"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  HOME_BY_ROLE,
  clearSessionCookie,
  setSessionCookie,
  type Role,
} from "@/lib/session";

export interface LoginState {
  error?: string;
}

// Compared against when the email is unknown, so the response time does not
// reveal whether the account exists (design rule 5).
const DUMMY_HASH = "$2b$10$RaSdj05SXA5tLJplk7P3Y.i2xVL/4WJo0u8Jsk1XwyJuv/R1HPoOi";

const WORK_EMAIL = /^[^\s@]+@budiman\.com$/;

// Only a plain internal path of the user's own role survives (rule 8);
// anything else — off-site, protocol-relative, or another role's page —
// sends the user to their own home instead.
function safeTarget(next: unknown, role: Role): string {
  const home = HOME_BY_ROLE[role];
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return home;
  }
  const targetRole = Object.entries(HOME_BY_ROLE).find(
    ([, path]) => path === next
  )?.[0] as Role | undefined;
  return targetRole === role ? next : home;
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!WORK_EMAIL.test(email)) {
    return { error: "Please use your @budiman.com work email." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await bcrypt.compare(
    password,
    user?.password ?? DUMMY_HASH
  );

  if (!user || !passwordMatches) {
    // One message for both cases — never say which part was wrong (AC-03).
    return { error: "Incorrect email or password" };
  }

  const role = user.role as Role;
  await setSessionCookie(user.id, role);
  redirect(safeTarget(formData.get("next"), role));
}

// One-click logout (rule 10): clear the cookie, back at /login with a notice.
export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login?msg=loggedout");
}
