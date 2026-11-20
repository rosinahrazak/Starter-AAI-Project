// Shared leave-request logic (design §6): the status union, the labels and
// pill colours from design §9, the working-day count and the one map of
// allowed transitions every server action checks against (rule 5).
// No database or cookies here — pure data and pure functions, so pages and
// actions can both use it.

export const LEAVE_STATUSES = [
  "PENDING_SUPERVISOR",
  "SIGNED",
  "PENDING_HR",
  "APPROVED",
  "REJECTED_BY_SUPERVISOR",
  "REJECTED_BY_HR",
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

// Shown labels, exactly as the brief §5.2 names them (requirements §2).
export const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING_SUPERVISOR: "Pending supervisor",
  SIGNED: "Signed",
  PENDING_HR: "Pending HR",
  APPROVED: "Approved",
  REJECTED_BY_SUPERVISOR: "Rejected by supervisor",
  REJECTED_BY_HR: "Rejected by HR",
};

// Status pill colours (design §9): white text on a coloured pill.
export const STATUS_PILL: Record<LeaveStatus, string> = {
  PENDING_SUPERVISOR: "bg-amber-500",
  SIGNED: "bg-blue-600",
  PENDING_HR: "bg-violet-600",
  APPROVED: "bg-emerald-600",
  REJECTED_BY_SUPERVISOR: "bg-red-600",
  REJECTED_BY_HR: "bg-red-600",
};

export function isLeaveStatus(value: unknown): value is LeaveStatus {
  return typeof value === "string" && (LEAVE_STATUSES as readonly string[]).includes(value);
}

// The five server actions that move a request, and the one move each makes.
// An action is legal only when the row it reads from the database is in
// `from` right now (rule 5, rule 13) — a stale tab or forged POST fails here.
export type LeaveAction =
  | "sign"
  | "rejectSupervisor"
  | "sendToHr"
  | "approve"
  | "rejectHr";

export const TRANSITIONS: Record<
  LeaveAction,
  { from: LeaveStatus; to: LeaveStatus; remarkRequired: boolean }
> = {
  sign: { from: "PENDING_SUPERVISOR", to: "SIGNED", remarkRequired: false },
  rejectSupervisor: {
    from: "PENDING_SUPERVISOR",
    to: "REJECTED_BY_SUPERVISOR",
    remarkRequired: true,
  },
  sendToHr: { from: "SIGNED", to: "PENDING_HR", remarkRequired: false },
  approve: { from: "PENDING_HR", to: "APPROVED", remarkRequired: false },
  rejectHr: {
    from: "PENDING_HR",
    to: "REJECTED_BY_HR",
    remarkRequired: true,
  },
};

export const DECIDED_STATUSES: readonly LeaveStatus[] = [
  "APPROVED",
  "REJECTED_BY_SUPERVISOR",
  "REJECTED_BY_HR",
];

export function isDecided(status: LeaveStatus): boolean {
  return DECIDED_STATUSES.includes(status);
}

// The messages every action shows when it refuses (requirements U19, AC-22).
export const REFUSAL_NOT_DECIDED = "This request has already been decided.";
export const REFUSAL_NOT_ALLOWED = "You cannot act on this request.";

// Parse a strict YYYY-MM-DD date input into a Date at UTC midnight.
// Anything else returns null — never guess a date from loose strings.
export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  // Reject impossible dates like 2026-02-30 (Date would roll them over).
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

// Today at UTC midnight on the server — the "today or later" cut-off (rule 9).
export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Working days between the dates inclusive, Saturdays and Sundays excluded
// (interview answer; design rule 9). Dates must be UTC midnights.
// e.g. Tue 2026-12-01 → Mon 2026-12-07 is 5, not 7.
export function countWorkingDays(start: Date, end: Date): number {
  let days = 0;
  for (
    let day = start.getTime();
    day <= end.getTime();
    day += 24 * 60 * 60 * 1000
  ) {
    const weekday = new Date(day).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days++;
  }
  return days;
}
