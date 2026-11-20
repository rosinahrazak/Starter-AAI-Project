// /employee — the employee's own requests (design §4): newest first, with
// type, dates, days, status pill and remarks, plus the "New request" link.
// Only this user's rows are ever queried (AC-20).
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestTable, type RequestRow } from "@/components/leave/request-table";
import { SendToHrButton } from "./send-to-hr-button";

export default async function EmployeeHome() {
  const user = await requireRole("EMPLOYEE");
  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: user.id },
    include: {
      leaveType: true,
      supervisor: { select: { name: true } },
      hrOfficer: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const rows: RequestRow[] = requests.map((r) => ({
    id: r.id,
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
      <div className="glass-card w-full max-w-4xl px-8 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-950">My leave requests</h1>
            <p className="mt-2 text-indigo-950/80">
              Welcome, {user.name}. Your requests, newest first.
            </p>
          </div>
          <Link
            href="/employee/leave/new"
            className="rounded-lg bg-purple-800 px-4 py-2.5 font-semibold text-white transition hover:bg-purple-700"
          >
            New request
          </Link>
        </div>
        <div className="mt-6">
          <RequestTable
            rows={rows}
            emptyMessage="No leave requests yet — click “New request” to submit your first one."
            renderActions={(row) =>
              // Button on Signed rows only (design §4); Pending-HR rows stay
              // mounted so the success message survives revalidation, and the
              // action re-checks the status server-side either way (rule 13).
              row.status === "SIGNED" || row.status === "PENDING_HR" ? (
                <SendToHrButton id={row.id} status={row.status} />
              ) : null
            }
          />
        </div>
      </div>
    </main>
  );
}
