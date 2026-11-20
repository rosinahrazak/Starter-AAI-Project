// Signed session cookie, per docs/specs/02-design.md rule 6.
// The payload holds only what the proxy and pages need to decide access:
// the user id and role. Never put names, emails or anything sensitive here.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours (interview Q3)

export const ROLES = ["EMPLOYEE", "SUPERVISOR", "HR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

// Each role's home page (design §4). Used by the proxy, pages and login.
export const HOME_BY_ROLE: Record<Role, string> = {
  EMPLOYEE: "/employee",
  SUPERVISOR: "/supervisor",
  HR: "/hr",
  ADMIN: "/admin",
};

export interface SessionPayload {
  userId: number;
  role: Role;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Generate one with node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))" and put it in .env (design rule 13).'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  userId: number,
  role: Role
): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

// Returns the payload only when the signature is intact and unexpired.
// Anything else — tampered, forged or expired — counts as logged out (AC-07).
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "number" ||
      !ROLES.includes(payload.role as Role)
    ) {
      return null;
    }
    return { userId: payload.userId, role: payload.role as Role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  userId: number,
  role: Role
): Promise<void> {
  const token = await createSessionToken(userId, role);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
