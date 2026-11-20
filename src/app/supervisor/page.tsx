// /supervisor — the signed-in supervisor's queue (design §4): requests
// addressed to me in PENDING_SUPERVISOR, and below my decided requests.
// Only rows whose supervisorId is this user are ever queried (AC-14);
// the actions repeat the check server-side (rule 13).
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DECIDED_STATUSES } from "@/lib/leave";
import { RequestRow } from "@/components/leave/request-table";
import { SupervisorBoard } from "./supervisor-board";

export default async function SupervisorHome() {
  const user = await requireRole("SUPERVISOR");

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
    hrOfficer: { name: string } | null;
  }): RequestRow {
    return {
      id: r.id,
      employeeName: r.employee.name,
      supervisorName: user.name,
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

  const include = {
    leaveType: true,
    employee: { select: { name: true } },
    hrOfficer: { select: { name: true } },
  };

  // Queue first (oldest waiting first), decided below (newest activity last
  // touched first).
  const [pending, decided] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { supervisorId: user.id, status: "PENDING_SUPERVISOR" },
      include,
      orderBy: { submittedAt: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { supervisorId: user.id, status: { in: [...DECIDED_STATUSES] } },
      include,
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="glass-card w-full max-w-5xl px-8 py-10">
        <h1 className="text-2xl font-bold text-indigo-950">Supervisor queue</h1>
        <p className="mt-2 mb-6 text-indigo-950/80">
          Welcome, {user.name}. Sign or reject your team&apos;s requests.
        </p>
        <SupervisorBoard
          pending={pending.map(toRow)}
          decided={decided.map(toRow)}
        />
      </div>
    </main>
  );
}
