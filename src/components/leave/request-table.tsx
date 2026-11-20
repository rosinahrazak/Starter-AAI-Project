// One table component shared by the five leave screens (design §6). Present-
// ation only: it never queries the database and trusts nothing it renders —
// React escapes every field, including the free-text remarks (design §7).
import type { ReactNode } from "react";
import { StatusPill } from "./status-pill";

export interface RequestRow {
  id: number;
  employeeName?: string; // shown when showEmployee is on (admin)
  supervisorName: string;
  typeLabel: string; // e.g. "Annual leave", or "Other"
  otherLeaveType: string | null;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  status: string;
  supervisorRemark: string | null;
  hrRemark: string | null;
  hrOfficerName: string | null; // set once HR has decided
}

function day(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function RequestTable({
  rows,
  showEmployee = false,
  showDecidingOfficer = false,
  renderActions,
  emptyMessage,
}: {
  rows: RequestRow[];
  showEmployee?: boolean;
  // HR/admin list the deciding officer in its own column, since an approval
  // has no remark but still must name who decided (design §4 /hr, /admin).
  showDecidingOfficer?: boolean;
  renderActions?: (row: RequestRow) => ReactNode;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-white/10 px-4 py-6 text-center text-indigo-950/80">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/30 bg-white/10">
      <table className="w-full text-left text-sm text-indigo-950">
        <thead className="bg-white/20 text-xs uppercase tracking-wide">
          <tr>
            {showEmployee && <th className="px-3 py-2">Employee</th>}
            <th className="px-3 py-2">Supervisor</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">From</th>
            <th className="px-3 py-2">To</th>
            <th className="px-3 py-2">Days</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Remarks</th>
            {showDecidingOfficer && <th className="px-3 py-2">Decided by</th>}
            {renderActions && <th className="px-3 py-2">Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/20 align-top">
              {showEmployee && <td className="px-3 py-2">{row.employeeName}</td>}
              <td className="px-3 py-2">{row.supervisorName}</td>
              <td className="px-3 py-2">
                {row.typeLabel}
                {row.otherLeaveType && (
                  <span className="block text-xs italic opacity-80">
                    “{row.otherLeaveType}”
                  </span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{day(row.startDate)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{day(row.endDate)}</td>
              <td className="px-3 py-2">{row.daysCount}</td>
              <td className="px-3 py-2">
                <StatusPill status={row.status} />
              </td>
              <td className="px-3 py-2 text-xs">
                {row.supervisorRemark && (
                  <span className="block">
                    Supervisor: {row.supervisorRemark}
                  </span>
                )}
                {row.hrRemark && (
                  <span className="block">
                    HR{row.hrOfficerName ? ` (${row.hrOfficerName})` : ""}:{" "}
                    {row.hrRemark}
                  </span>
                )}
                {!row.supervisorRemark && !row.hrRemark && (
                  <span className="opacity-50">—</span>
                )}
              </td>
              {showDecidingOfficer && (
                <td className="px-3 py-2">
                  {row.hrOfficerName ?? <span className="opacity-50">—</span>}
                </td>
              )}
              {renderActions && (
                <td className="px-3 py-2 whitespace-nowrap">
                  {renderActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
