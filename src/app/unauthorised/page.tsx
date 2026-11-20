import { requireUser } from "@/lib/auth";
import { HOME_BY_ROLE, type Role } from "@/lib/session";

export default async function UnauthorisedPage() {
  const user = await requireUser();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card w-full max-w-lg px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-indigo-950">
          You are not authorised to view this page.
        </h1>
        <p className="mt-3 text-indigo-950/80">This page belongs to another role.</p>
        <a
          href={HOME_BY_ROLE[user.role as Role]}
          className="mt-6 inline-block rounded-lg bg-purple-800 px-5 py-2.5 font-semibold text-white transition hover:bg-purple-700"
        >
          Back to my home
        </a>
      </div>
    </main>
  );
}
