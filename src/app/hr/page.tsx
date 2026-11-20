import { requireRole } from "@/lib/auth";

export default async function HrHome() {
  const user = await requireRole("HR");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card w-full max-w-lg px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-indigo-950">HR home</h1>
        <p className="mt-3 text-indigo-950/80">
          Welcome, {user.name}. The HR queue will appear here.
        </p>
      </div>
    </main>
  );
}
