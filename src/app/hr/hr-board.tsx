"use client";

// /hr body (design §4): the shared Pending-HR queue with Approve and
// Reject + remark, and below the decided requests naming who decided.
// Client component with the feedback message above the tables, for the same
// reason as the supervisor board: the acted-on row leaves the queue during
// revalidation, so the message must live outside it (FR-07).
import { useState } from "react";
import { RequestTable, type RequestRow } from "@/components/leave/request-table";
import { approveRequest, rejectRequestHr } from "./actions";

type Feedback = { kind: "success" | "error"; text: string };

function FeedbackBanner({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return feedback.kind === "success" ? (
    <p className="mb-4 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm text-white">
      {feedback.text}
    </p>
  ) : (
    <p
      role="alert"
      className="mb-4 rounded-lg bg-red-600/90 px-3 py-2 text-sm text-white"
    >
      {feedback.text}
    </p>
  );
}

function ApproveButton({
  id,
  busy,
  disabled,
  onStart,
  onFinish,
}: {
  id: number;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
  onFinish: (result: { error?: string; success?: string }) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={async () => {
        if (!window.confirm("Approve this request?")) return;
        onStart();
        const formData = new FormData();
        formData.set("id", String(id));
        onFinish(await approveRequest(undefined, formData));
      }}
      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition enabled:hover:bg-emerald-600 disabled:opacity-60"
    >
      {busy ? "Approving…" : "Approve"}
    </button>
  );
}

function RejectForm({
  id,
  busy,
  disabled,
  onStart,
  onFinish,
}: {
  id: number;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
  onFinish: (result: { error?: string; success?: string }) => void;
}) {
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!window.confirm("Reject this request?")) return;
        const formData = new FormData(e.currentTarget);
        formData.set("id", String(id));
        onStart();
        onFinish(await rejectRequestHr(undefined, formData));
      }}
    >
      <textarea
        name="remark"
        rows={2}
        placeholder="Reason for rejecting (required)"
        className="w-44 rounded-md border border-white/50 bg-white/70 px-2 py-1 text-xs text-indigo-950 outline-none focus:border-purple-700"
      />
      <button
        type="submit"
        disabled={disabled}
        className="self-start rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition enabled:hover:bg-red-500 disabled:opacity-60"
      >
        {busy ? "Rejecting…" : "Reject"}
      </button>
    </form>
  );
}

export function HrBoard({
  pending,
  decided,
}: {
  pending: RequestRow[];
  decided: RequestRow[];
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function start(rowId: number) {
    setFeedback(null);
    setBusyId(rowId);
  }
  function finish(result: { error?: string; success?: string }) {
    setBusyId(null);
    setFeedback(
      result.success
        ? { kind: "success", text: result.success }
        : { kind: "error", text: result.error ?? "Something went wrong." }
    );
  }

  return (
    <>
      <FeedbackBanner feedback={feedback} />
      <h2 className="mb-2 text-lg font-semibold text-indigo-950">
        Waiting for HR
      </h2>
      <RequestTable
        rows={pending}
        showEmployee
        emptyMessage="No requests are waiting for HR."
        renderActions={(row) => (
          <div className="flex items-start gap-3">
            <ApproveButton
              id={row.id}
              busy={busyId === row.id}
              disabled={busyId !== null}
              onStart={() => start(row.id)}
              onFinish={finish}
            />
            <RejectForm
              id={row.id}
              busy={busyId === row.id}
              disabled={busyId !== null}
              onStart={() => start(row.id)}
              onFinish={finish}
            />
          </div>
        )}
      />
      {decided.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-indigo-950">
            Decided requests
          </h2>
          <RequestTable
            rows={decided}
            showEmployee
            showDecidingOfficer
            emptyMessage=""
          />
        </div>
      )}
    </>
  );
}
