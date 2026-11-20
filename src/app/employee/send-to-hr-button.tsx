"use client";

// "Send to HR" button on the employee's own Signed rows (design §4). Confirm
// first, then the sendToHr action flips it to Pending HR (FR-07, AC-17).
// The id rides in a hidden field; the action still re-reads and re-checks
// the row server-side (design rules 3, 13).
//
// The parent keeps this mounted on PENDING_HR rows too: after a successful
// send the row becomes PENDING_HR, but we must stay mounted so the success
// message survives the revalidation re-render. Only a SIGNED row shows the
// button (spec: "button appears only on Signed rows").
import { useActionState } from "react";
import { sendToHr } from "./actions";

export function SendToHrButton({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(sendToHr, undefined);

  // Already sent: show the one-line success (FR-07) instead of the button.
  if (state?.success && !state.error) {
    return (
      <p className="rounded-md bg-emerald-600/90 px-2 py-1 text-xs text-white">
        {state.success}
      </p>
    );
  }

  // Only a Signed row gets the button; a stale PENDING_HR row renders nothing
  // but stays mounted so the success message above is not thrown away.
  if (status !== "SIGNED") return null;

  return (
    <form
      action={formAction}
      className="flex flex-col items-start gap-1"
      onSubmit={(e) => {
        if (!window.confirm("Send this request to HR?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white transition enabled:hover:bg-purple-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send to HR"}
      </button>
      {state?.error && (
        <p
          role="alert"
          className="rounded-md bg-red-600/90 px-2 py-1 text-xs text-white"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
