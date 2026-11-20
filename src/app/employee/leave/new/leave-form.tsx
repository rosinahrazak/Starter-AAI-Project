"use client";

// Client component for useActionState (login spec pattern): shows the
// validation errors and the success message, and asks for confirmation
// before submitting (FR-07). The real checks live in the server action.
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitLeaveRequest } from "../../actions";

interface SupervisorOption {
  id: number;
  name: string;
  division: string;
}
interface LeaveTypeOption {
  id: number;
  code: string;
  label: string;
}

const fieldClasses =
  "w-full rounded-none border-0 border-b border-indigo-950/40 bg-transparent px-1 pb-2 pt-1 text-indigo-950 outline-none transition focus:border-indigo-950";
const labelClasses = "mb-1 block text-sm font-medium text-indigo-950";

export function LeaveForm({
  supervisors,
  leaveTypes,
}: {
  supervisors: SupervisorOption[];
  leaveTypes: LeaveTypeOption[];
}) {
  const [state, formAction, pending] = useActionState(submitLeaveRequest, undefined);
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const selectedType = leaveTypes.find((t) => t.id === Number(typeId));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        // FR-07: confirm before the request goes in. Cancel = no action.
        if (!window.confirm("Submit this leave request?")) {
          event.preventDefault();
        }
      }}
    >
      <div>
        <label htmlFor="supervisorId" className={labelClasses}>
          Supervisor (from your division)
        </label>
        <select
          id="supervisorId"
          name="supervisorId"
          required
          className={fieldClasses}
          defaultValue=""
        >
          <option value="" disabled>
            Choose a supervisor…
          </option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.division}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="leaveTypeId" className={labelClasses}>
          Leave type
        </label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          required
          className={fieldClasses}
          value={typeId ?? ""}
          onChange={(event) => setTypeId(Number(event.target.value))}
        >
          <option value="" disabled>
            Choose a leave type…
          </option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {selectedType?.code === "OTHER" && (
        <div>
          <label htmlFor="otherLeaveType" className={labelClasses}>
            What is the leave for?
          </label>
          <textarea
            id="otherLeaveType"
            name="otherLeaveType"
            required
            rows={2}
            placeholder="Describe what the leave is for"
            className={fieldClasses}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className={labelClasses}>
            From
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            min={today}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="endDate" className={labelClasses}>
            To
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            min={today}
            className={fieldClasses}
          />
        </div>
      </div>
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-600/90 px-3 py-2 text-center text-sm text-white"
        >
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-600/90 px-3 py-2 text-center text-sm text-white">
          {state.success}{" "}
          <Link href="/employee" className="underline">
            View my requests
          </Link>
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-purple-800 px-4 py-2.5 font-semibold text-white transition enabled:hover:bg-purple-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
