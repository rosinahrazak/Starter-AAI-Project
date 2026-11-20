"use client";

// /supervisor body (design §4): the "For you to sign" queue with Sign and
// Reject + remark, and below it my decided requests.
//
// It is one client component because the success/error message must survive
// the action's revalidation: the acted-on row leaves the queue, so a
// message inside the row would unmount before the user can read it (FR-07).
// The message lives here, above the tables, exactly one at a time.
import { useState } from "react";
import { RequestTable, type RequestRow } from "@/components/leave/request-table";
import { rejectRequest, signRequest } from "./actions";

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

function SignButton({
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
        if (!window.confirm("Sign this request?")) return;
        onStart();
        const formData = new FormData();
        formData.set("id", String(id));
        onFinish(await signRequest(undefined, formData));
      }}
      className="rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white transition enabled:hover:bg-purple-700 disabled:opacity-60"
    >
      {busy ? "Signing…" : "Sign"}
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
        onFinish(await rejectRequest(undefined, formData));
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

export function SupervisorBoard({
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
        For you to sign
      </h2>
      <RequestTable
        rows={pending}
        showEmployee
        emptyMessage="Nothing is waiting for your signature."
        renderActions={(row) => (
          <div className="flex items-start gap-3">
            <SignButton
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
            My decided requests
          </h2>
          <RequestTable rows={decided} showEmployee emptyMessage="" />
        </div>
      )}
    </>
  );
}
