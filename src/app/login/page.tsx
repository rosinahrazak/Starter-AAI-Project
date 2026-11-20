import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; msg?: string }>;
}) {
  const { next, msg } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm px-8 pb-10 pt-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo-950/60">
          Budiman HRMS
        </p>
        <h1 className="mt-2 text-center text-3xl font-bold text-indigo-950">Login</h1>
        <p className="mb-8 mt-2 text-center text-sm text-indigo-950/70">
          Sign in with your work email.
        </p>
        {msg === "loggedout" && (
          <p
            role="status"
            className="mb-6 rounded-lg bg-emerald-600/90 px-3 py-2 text-center text-sm text-white"
          >
            You have been logged out.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
