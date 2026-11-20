import { requireRole } from "@/lib/auth";

export default async function SupervisorHome() {
  const user = await requireRole("SUPERVISOR");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card w-full max-w-lg px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-indigo-950">Supervisor home</h1>
        <p className="mt-3 text-indigo-950/80">
          Welcome, {user.name}. Requests waiting for your signature will appear
          here.
        </p>
      </div>
    </main>
  );
}
