// Status pill shared by all five leave screens (design §9): one coloured
// pill per row, labels exactly as brief §5.2 names them.
import { isLeaveStatus, STATUS_LABEL, STATUS_PILL } from "@/lib/leave";

export function StatusPill({ status }: { status: string }) {
  if (!isLeaveStatus(status)) {
    // Corrupted status must never render an unstyled blob.
    return <span className="rounded-full bg-slate-500 px-3 py-1 text-xs text-white">{status}</span>;
  }
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium text-white ${STATUS_PILL[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
