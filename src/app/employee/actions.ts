"use server";

// Server actions for the employee (design §6). Every field arriving from the
// form is re-validated here against the database — hidden form fields and
// buttons are convenience, never the check (rules 3, 9, 10, 13).
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REFUSAL_NOT_ALLOWED,
  REFUSAL_NOT_DECIDED,
  TRANSITIONS,
  countWorkingDays,
  isDecided,
  isLeaveStatus,
  parseDateInput,
  todayUtc,
} from "@/lib/leave";

export interface SubmitState {
  error?: string;
  success?: string;
}

export async function submitLeaveRequest(
  _prevState: SubmitState | undefined,
  formData: FormData
): Promise<SubmitState> {
  const user = await requireRole("EMPLOYEE");

  // Supervisor: must be a SUPERVISOR in the employee's own division, re-read
  // from the database — the form only ever sends an id (rule 3, AC-22).
  const supervisorId = Number(formData.get("supervisorId"));
  const supervisor = Number.isInteger(supervisorId)
    ? await prisma.user.findFirst({
        where: { id: supervisorId, role: "SUPERVISOR", division: user.division },
      })
    : null;
  if (!supervisor) {
    return { error: "Please choose a supervisor from your own division." };
  }

  // Leave type must be one of the five seeded rows (brief §7.2).
  const leaveTypeId = Number(formData.get("leaveTypeId"));
  const leaveType = Number.isInteger(leaveTypeId)
    ? await prisma.leaveType.findUnique({ where: { id: leaveTypeId } })
    : null;
  if (!leaveType) return { error: "Please choose a leave type." };

  const startDate = parseDateInput(formData.get("startDate"));
  const endDate = parseDateInput(formData.get("endDate"));
  if (!startDate || !endDate) {
    return { error: "Please choose valid start and end dates." };
  }
  if (startDate < todayUtc()) {
    return { error: "Start date cannot be in the past." };
  }
  if (endDate < startDate) {
    return { error: "End date cannot be before the start date." };
  }

  // "Other" always carries a description (rule 10).
  const otherLeaveType = String(formData.get("otherLeaveType") ?? "").trim();
  if (leaveType.code === "OTHER" && otherLeaveType === "") {
    return { error: "Please describe what the leave is for." };
  }

  // daysCount, status and timestamps are set by the server only (design §7).
  await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      supervisorId: supervisor.id,
      leaveTypeId: leaveType.id,
      otherLeaveType: leaveType.code === "OTHER" ? otherLeaveType : null,
      startDate,
      endDate,
      daysCount: countWorkingDays(startDate, endDate),
      status: "PENDING_SUPERVISOR",
    },
  });

  revalidatePath("/employee");
  return { success: "Leave request submitted." };
}

// SIGNED → PENDING_HR, owner only (design rule 5, brief §5.3 rule 5). The
// row is re-read from the database with the owner filter — a forged POST
// carrying someone else's id is simply not found (rule 3, AC-22).
export async function sendToHr(
  _prevState: SubmitState | undefined,
  formData: FormData
): Promise<SubmitState> {
  const user = await requireRole("EMPLOYEE");

  const id = Number(formData.get("id"));
  const row = Number.isInteger(id)
    ? await prisma.leaveRequest.findFirst({ where: { id, employeeId: user.id } })
    : null;
  if (!row || !isLeaveStatus(row.status)) {
    return { error: REFUSAL_NOT_ALLOWED };
  }

  // The stale tab hits this branch: the row is already past SIGNED.
  if (isDecided(row.status)) return { error: REFUSAL_NOT_DECIDED };
  const move = TRANSITIONS.sendToHr;
  if (row.status !== move.from) return { error: REFUSAL_NOT_ALLOWED };

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: move.to, sentToHrAt: new Date() },
  });

  revalidatePath("/employee");
  return { success: "Request sent to HR." };
}
