// /hr — the shared HR queue (design §4): every PENDING_HR request is visible
// to both HR officers (rule 7 — no addressee filter), and below it the
// decided requests naming the officer who decided. Each officer's name is
// recorded server-side when they decide (actions.ts).
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DECIDED_STATUSES } from "@/lib/leave";
import { RequestRow } from "@/components/leave/request-table";
import { HrBoard } from "./hr-board";

export default async function HrHome() {
  const user = await requireRole("HR");

  const include = {
    leaveType: true,
    employee: { select: { name: true } },
    supervisor: { select: { name: true } },
    hrOfficer: { select: { name: true } },
  };

  function toRow(r: {
    id: number;
    startDate: Date;
    endDate: Date;
    daysCount: number;
    status: string;
    supervisorRemark: string | null;
    hrRemark: string | null;
    leaveType: { label: string };
    otherLeaveType: string | null;
    employee: { name: string };
    supervisor: { name: string };
    hrOfficer: { name: string } | null;
  }): RequestRow {
    return {
      id: r.id,
      employeeName: r.employee.name,
      supervisorName: r.supervisor.name,
      typeLabel: r.leaveType.label,
      otherLeaveType: r.otherLeaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      daysCount: r.daysCount,
      status: r.status,
      supervisorRemark: r.supervisorRemark,
      hrRemark: r.hrRemark,
      hrOfficerName: r.hrOfficer?.name ?? null,
    };
  }

  const [pending, decided] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "PENDING_HR" },
      include,
      orderBy: { sentToHrAt: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { status: { in: [...DECIDED_STATUSES] } },
      include,
      orderBy: { decidedAt: "desc" },
    }),
  ]);

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="glass-card w-full max-w-5xl px-8 py-10">
        <h1 className="text-2xl font-bold text-indigo-950">HR queue</h1>
        <p className="mt-2 mb-6 text-indigo-950/80">
          Welcome, {user.name}. Approve or reject requests waiting for HR.
        </p>
        <HrBoard pending={pending.map(toRow)} decided={decided.map(toRow)} />
      </div>
    </main>
  );
}
