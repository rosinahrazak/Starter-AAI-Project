"use client";

import { useActionState } from "react";
import { login } from "./actions";

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const fieldClasses =
  "w-full rounded-none border-0 border-b border-white/60 bg-transparent px-1 pb-2 pt-1 text-indigo-950 placeholder-indigo-950/50 outline-none transition focus:border-white";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="relative">
        <label htmlFor="email" className="sr-only">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="Email"
          className={fieldClasses}
        />
        <MailIcon className="pointer-events-none absolute right-1 top-2 h-5 w-5 text-indigo-950/60" />
      </div>
      <div className="relative">
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
          className={fieldClasses}
        />
        <LockIcon className="pointer-events-none absolute right-1 top-2 h-5 w-5 text-indigo-950/60" />
      </div>
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-600/90 px-3 py-2 text-center text-sm text-white"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-purple-800 px-4 py-2.5 font-semibold text-white transition enabled:hover:bg-purple-700 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Login"}
      </button>
    </form>
  );
}
