// /admin — every request, read-only (design §4, rule 12): employee,
// supervisor, type, dates, days, status, both remarks and the deciding
// officer. No controls that change data are rendered; the header "Log out"
// is the only button (AC-21, FR-08). Admin sees all rows, so the query has
// no owner filter.
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestTable, type RequestRow } from "@/components/leave/request-table";

export default async function AdminHome() {
  const user = await requireRole("ADMIN");

  const requests = await prisma.leaveRequest.findMany({
    include: {
      leaveType: true,
      employee: { select: { name: true } },
      supervisor: { select: { name: true } },
      hrOfficer: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const rows: RequestRow[] = requests.map((r) => ({
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
  }));

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="glass-card w-full max-w-6xl px-8 py-10">
        <h1 className="text-2xl font-bold text-indigo-950">
          All leave requests
        </h1>
        <p className="mt-2 mb-6 text-indigo-950/80">
          Welcome, {user.name}. Read-only view of every request — nothing here
          changes data.
        </p>
        <RequestTable
          rows={rows}
          showEmployee
          showDecidingOfficer
          emptyMessage="No leave requests have been submitted yet."
        />
      </div>
    </main>
  );
}
