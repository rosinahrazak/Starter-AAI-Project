"use server";

// Server actions for the supervisor queue (design §6): sign and reject.
// The row is always re-read from the database with the addressee filter —
// only the assigned supervisor may act, and only from the status the
// transition map allows (rules 5, 8, 13). The UI's buttons are convenience,
// never the check.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REFUSAL_NOT_ALLOWED,
  REFUSAL_NOT_DECIDED,
  TRANSITIONS,
  isDecided,
  isLeaveStatus,
} from "@/lib/leave";

export interface SupervisorActionState {
  error?: string;
  success?: string;
}

// Owner check: the row must exist AND be addressed to this supervisor.
async function loadForSupervisor(id: unknown) {
  const user = await requireRole("SUPERVISOR");
  const row = Number.isInteger(Number(id))
    ? await prisma.leaveRequest.findFirst({
        where: { id: Number(id), supervisorId: user.id },
      })
    : null;
  return { user, row };
}

export async function signRequest(
  _prevState: SupervisorActionState | undefined,
  formData: FormData
): Promise<SupervisorActionState> {
  const { row } = await loadForSupervisor(formData.get("id"));
  if (!row || !isLeaveStatus(row.status)) {
    return { error: REFUSAL_NOT_ALLOWED };
  }
  if (isDecided(row.status)) return { error: REFUSAL_NOT_DECIDED };

  const move = TRANSITIONS.sign;
  if (row.status !== move.from) return { error: REFUSAL_NOT_ALLOWED };

  // signedAt is set when the supervisor signs or rejects (design §1).
  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: move.to, signedAt: new Date() },
  });

  revalidatePath("/supervisor");
  return { success: "Request signed — waiting for the employee to send it to HR." };
}

export async function rejectRequest(
  _prevState: SupervisorActionState | undefined,
  formData: FormData
): Promise<SupervisorActionState> {
  const { row } = await loadForSupervisor(formData.get("id"));
  if (!row || !isLeaveStatus(row.status)) {
    return { error: REFUSAL_NOT_ALLOWED };
  }
  if (isDecided(row.status)) return { error: REFUSAL_NOT_DECIDED };

  const move = TRANSITIONS.rejectSupervisor;
  if (row.status !== move.from) return { error: REFUSAL_NOT_ALLOWED };

  // A reason is required to reject (brief §5.3, AC-16) — checked here on the
  // arriving form data, not on what the browser chose to show.
  const remark = String(formData.get("remark") ?? "").trim();
  if (move.remarkRequired && remark === "") {
    return { error: "Please give a reason for rejecting." };
  }

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: move.to, supervisorRemark: remark, signedAt: new Date() },
  });

  revalidatePath("/supervisor");
  return { success: "Request rejected — the employee can see your reason." };
}
