"use server";

// Server actions for the HR queue (design §6): approve and reject. Unlike
// the supervisor actions there is no addressee filter — the HR queue is
// shared (design §4), so either officer may act on any PENDING_HR request
// (rule 7). The status is still re-read from the database on every action
// (rules 5, 13), and the deciding officer is recorded server-side.
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

export interface HrActionState {
  error?: string;
  success?: string;
}

async function loadPending(id: unknown) {
  const user = await requireRole("HR");
  const row = Number.isInteger(Number(id))
    ? await prisma.leaveRequest.findUnique({ where: { id: Number(id) } })
    : null;
  return { user, row };
}

export async function approveRequest(
  _prevState: HrActionState | undefined,
  formData: FormData
): Promise<HrActionState> {
  const { user, row } = await loadPending(formData.get("id"));
  if (!row || !isLeaveStatus(row.status)) {
    return { error: REFUSAL_NOT_ALLOWED };
  }
  // The stale tab (another officer decided first) hits this branch (AC-22).
  if (isDecided(row.status)) return { error: REFUSAL_NOT_DECIDED };

  const move = TRANSITIONS.approve;
  if (row.status !== move.from) return { error: REFUSAL_NOT_ALLOWED };

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: {
      status: move.to,
      hrOfficerId: user.id, // who decided, shown on the HR and admin lists
      decidedAt: new Date(), // design §1: set when HR approves or rejects
    },
  });

  revalidatePath("/hr");
  return { success: "Request approved." };
}

export async function rejectRequestHr(
  _prevState: HrActionState | undefined,
  formData: FormData
): Promise<HrActionState> {
  const { user, row } = await loadPending(formData.get("id"));
  if (!row || !isLeaveStatus(row.status)) {
    return { error: REFUSAL_NOT_ALLOWED };
  }
  if (isDecided(row.status)) return { error: REFUSAL_NOT_DECIDED };

  const move = TRANSITIONS.rejectHr;
  if (row.status !== move.from) return { error: REFUSAL_NOT_ALLOWED };

  // A reason is required to reject (brief §5.3, AC-19).
  const remark = String(formData.get("remark") ?? "").trim();
  if (move.remarkRequired && remark === "") {
    return { error: "Please give a reason for rejecting." };
  }

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: {
      status: move.to,
      hrRemark: remark,
      hrOfficerId: user.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath("/hr");
  return { success: "Request rejected — the employee can see your reason." };
}
