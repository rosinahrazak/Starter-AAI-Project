import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/db";
import { getSessionPayload } from "@/lib/session";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Budiman HRMS",
  description: "Leave Request module for Budiman Company.",
};

// The header shows itself only when a session cookie verifies. It reads the
// session itself; the actual access checks live in the proxy and each page
// (design rule 7), so this is display only.
async function Header() {
  const session = await getSessionPayload();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  return (
    <header className="flex items-center justify-between px-6 py-4 text-white">
      <span className="font-semibold tracking-wide">Budiman HRMS</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/90">{user.name}</span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-white/60 px-4 py-1.5 text-sm text-white transition hover:bg-white/15"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="sunset-bg flex min-h-screen flex-col text-slate-900">
        <Header />
        {children}
      </body>
    </html>
  );
}
