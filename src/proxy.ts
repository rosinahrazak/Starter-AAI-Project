// Central gate for every route (design rules 7–9). Optimistic check only:
// the signed cookie is verified here, and pages/actions check again.
import { NextResponse, type NextRequest } from "next/server";
import {
  HOME_BY_ROLE,
  SESSION_COOKIE,
  verifySessionToken,
  type Role,
} from "@/lib/session";

const ROLE_BY_PATH: Record<string, Role> = Object.fromEntries(
  Object.entries(HOME_BY_ROLE).map(([role, path]) => [path, role as Role])
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  // Logged out: only the login page is open; protected pages ask to sign in
  // first, remembering where the user was heading (AC-05, rule 8).
  if (!session) {
    // /login is the guest's page — let it render (its own checks cover the
    // rest). /unauthorised falls through to the page, which sends guests to
    // /login itself.
    if (pathname === "/login") return NextResponse.next();
    const url = new URL("/login", request.nextUrl);
    if (ROLE_BY_PATH[pathname]) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in: the entry points take the user straight to their own home.
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(
      new URL(HOME_BY_ROLE[session.role], request.nextUrl)
    );
  }

  // Wrong role: the 403 screen, not the page (AC-06).
  const requiredRole = ROLE_BY_PATH[pathname];
  if (requiredRole && session.role !== requiredRole) {
    return NextResponse.redirect(new URL("/unauthorised", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
