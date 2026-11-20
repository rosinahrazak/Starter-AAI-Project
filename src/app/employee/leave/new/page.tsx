// Submit form (design §4): the employee's own-division supervisors and the
// five seeded leave types come from the database; the checks are in the
// server action, not here.
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LeaveForm } from "./leave-form";

export default async function NewLeaveRequest() {
  const user = await requireRole("EMPLOYEE");
  const [supervisors, leaveTypes] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPERVISOR", division: user.division },
      orderBy: { name: "asc" },
      select: { id: true, name: true, division: true },
    }),
    prisma.leaveType.findMany({ orderBy: { id: "asc" } }),
  ]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card w-full max-w-lg px-8 py-10">
        <h1 className="text-2xl font-bold text-indigo-950">New leave request</h1>
        <p className="mt-2 text-indigo-950/80">
          Pick your supervisor and the days you need, {user.name}.
        </p>
        <div className="mt-6">
          <LeaveForm
            supervisors={supervisors}
            leaveTypes={leaveTypes.map((t) => ({ id: t.id, code: t.code, label: t.label }))}
          />
        </div>
      </div>
    </main>
  );
}
