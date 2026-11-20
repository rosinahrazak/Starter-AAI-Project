# Login – Tasks

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| To do | 1 | Prisma setup + Users table | High | AC-10 (table part) |
| To do | 2 | Seed the six demo users | High | AC-10 |
| To do | 3 | Session library (sign / verify cookie) | High | AC-07, AC-08 (library part) |
| To do | 4 | Login form + server action | High | AC-01, AC-03, AC-04 |
| To do | 5 | Role home pages + `/` redirect | High | AC-01, AC-02 |
| To do | 6 | Middleware gate + `/unauthorised` screen | High | AC-05 (redirect part), AC-06, AC-07 |
| To do | 7 | Return to the page asked for | Medium | AC-05 (return part) |
| To do | 8 | Header + one-click logout | High | AC-09 |
| To do | 9 | Full check against the specs | High | All ACs + `npm run lint` |

---

## Task 1 – Prisma setup + Users table *(High)*

- **Goal:** The SQLite database exists with the `User` table exactly as the
  design defines it, empty and ready.
- **Files:** `prisma/schema.prisma` (new), `.env` (new: `DATABASE_URL`, plus a
  placeholder `SESSION_SECRET` for task 3), generated Prisma client.
- **From:** Design §1 (User table), design §3 (SQLite/Prisma), §7 (commands);
  brief §7.2 (Users fields, IC format, unique `@budiman.com` email).
- **Check:**
  • Run `npx prisma db push`
  • Run `npx prisma studio` → open `User`
  • You should see all nine fields from design §1 (`id`, `name`, `icNumber`,
    `email`, `password`, `role`, `division`, `designation`, `createdAt`),
    `email` marked unique, `role` an enum of the four roles, and zero rows.

## Task 2 – Seed the six demo users *(High)*

- **Goal:** `npx prisma db seed` loads the six users from design Reference B,
  each with `password123` stored as a bcrypt hash.
- **Files:** `prisma/seed.ts` (new, bcryptjs cost 10); `package.json` —
  **needs your approval** to add the standard `prisma.seed` script entry.
- **From:** U7, AC-10; design rule 12, Reference B, `prisma/seed.ts` in §5;
  brief §7.2 demo table and its "hashed, never plain text" note.
- **Check:**
  • Run `npx prisma db seed`, then `npx prisma studio`
  • You should see the six demo users with the right emails, IC numbers,
    roles, divisions and designations
  • The `password` column shows `$2a$…` bcrypt hashes — no row contains
    `password123` in plain text (AC-10).

## Task 3 – Session library *(High)*

- **Goal:** `src/lib/session.ts` can create a signed session cookie
  (HMAC-SHA256 via `jose`) holding user id, role and 8-hour expiry, and verify
  one — returning the user only if the signature is intact and unexpired.
- **Files:** `src/lib/session.ts` (new); `package.json` — **needs your
  approval** to add the `jose` dependency; `.env` (`SESSION_SECRET`, 32+
  characters).
- **From:** U6, AC-07/AC-08 (the signing side); design rules 6 and 13,
  §5 (`src/lib/session.ts`).
- **Check:**
  • Run a throwaway script with `npx tsx` that calls the library: sign a
    session for user 1, then verify it
  • A freshly signed token verifies and returns the user id and role
  • Changing one character of the token, or using an expiry in the past,
    makes verify return "no user"
  • The secret is read from `.env`; nothing secret is hard-coded.

## Task 4 – Login form + server action *(High)*

- **Goal:** `/login` accepts email + password: refuses non-`@budiman.com`
  emails, otherwise checks the hash on the server, sets the session cookie on
  success and shows the one generic message on failure.
- **Files:** `src/app/login/page.tsx` (new), `src/app/login/actions.ts` (new).
- **From:** U1, U3; AC-01 (login part), AC-03, AC-04; design §4 `/login`,
  rules 1, 2, 5, 6; brief §7.2 (email used to log in) and §7.5.
- **Check:**
  • Open `/login`, type `siti@gmail.com` → asked for a `@budiman.com` work
    email before any attempt (AC-04)
  • Sign in as `hr-1@budiman.com` with a wrong password →
    "Incorrect email or password" (AC-03)
  • Sign in as `nobody@budiman.com` with any password → the same message,
    same wording (AC-03)
  • Sign in as `hr-1@budiman.com` with `password123` → cookie `session`
    appears in dev tools with `HttpOnly`, `SameSite=Lax`, `Max-Age≈28800`
    (early AC-08).

## Task 5 – Role home pages + `/` redirect *(High)*

- **Goal:** The four role home pages exist as placeholders, each checking on
  the server that the visitor holds that role; `/` sends users to their home
  or to `/login`.
- **Files:** `src/app/employee/page.tsx`, `src/app/supervisor/page.tsx`,
  `src/app/hr/page.tsx`, `src/app/admin/page.tsx`, `src/app/page.tsx`
  (rewrite of the starter page), `src/lib/auth.ts` (new: `requireUser()` /
  `requireRole()`).
- **From:** U2; AC-01, AC-02; design §4 (home routes, `/` rule 7),
  §5 (page files, `src/lib/auth.ts`).
- **Check:**
  • Sign in as `employee-1@budiman.com` → land on `/employee` and see its
    placeholder (AC-01)
  • Sign in as `supervisor-1@…` → `/supervisor`; `hr-1@…` → `/hr`;
    `admin@…` → `/admin` (AC-02)
  • Visit `/` while signed in → your role's home; logged out → `/login`.

## Task 6 – Middleware gate + `/unauthorised` screen *(High)*

- **Goal:** Every route is gated in one place before the page runs: no valid
  session → `/login`, valid session but wrong role → `/unauthorised`, which
  explains the refusal and links home.
- **Files:** `src/middleware.ts` (new), `src/app/unauthorised/page.tsx` (new).
- **From:** U5, U9; AC-05 (redirect part), AC-06, AC-07; design §4
  (`/unauthorised`), rules 7–9, §5 (`src/middleware.ts`); brief FR-01.
- **Check:**
  • Log out, open `/hr` directly → see `/login` (AC-05 redirect part)
  • Sign in as `employee-1@budiman.com`, open `/hr` → "You are not authorised
    to view this page" + link back to `/employee`, no data shown (AC-06)
  • Edit any character of the `session` cookie, open `/employee` → sent to
    `/login` (AC-07).

## Task 7 – Return to the page asked for *(Medium)*

- **Goal:** After logging in, the user lands on the page they originally
  tried to open — but only if it is a plain internal path their role may
  see; anything else goes to their home (no open redirects).
- **Files:** `src/app/login/page.tsx`, `src/app/login/actions.ts` (the `next`
  handling); middleware passes `next`.
- **From:** U8 (Medium), AC-05 (return part); design rule 8.
- **Check:**
  • Log out, open `/hr` directly → `/login?next=/hr`
  • Sign in as `hr-1@budiman.com` → land on `/hr` (AC-05 complete)
  • Sign in as `employee-1@budiman.com` after the same `/login?next=/hr` →
    land on `/employee`, not `/hr`
  • `/login?next=https://evil.example` → land on own home, not off-site.

## Task 8 – Header + one-click logout *(High)*

- **Goal:** Every signed-in page shows the user's name and a "Log out"
  button; one click clears the cookie and returns to `/login` with
  "You have been logged out." Signed-in users hitting `/login` are bounced
  to their home.
- **Files:** `src/app/layout.tsx` (header + logout form/server action),
  `src/app/login/actions.ts` (add `logout`).
- **From:** U4, U9; AC-09; design §4 (`/login` behaviour, header note),
  rule 10, §5 (`src/app/layout.tsx`).
- **Check:**
  • Sign in → header shows your name and "Log out" on every page
  • Click "Log out" → `/login` with "You have been logged out." (AC-09)
  • Press browser Back, then open `/employee` directly → still taken to
    `/login` (AC-09)
  • While signed in, open `/login` → redirected to your home page.

## Task 9 – Full check against the specs *(High)*

- **Goal:** The whole module is walked through with the specs open, the lint
  passes, and every story in requirements §3 is demonstrated working.
- **Files:** none new — fixes only, and only after fixing the spec if
  behaviour and spec disagree (AGENTS.md: spec first).
- **From:** All user stories U1–U9; requirements §4 end to end; brief §8
  step "Check"; AGENTS.md ("`npm run lint` must pass").
- **Check:**
  • Run `npm run lint` → no errors
  • Run every AC-01…AC-10 from requirements §4 with the demo accounts,
    ticking the Status column as you go
  • Sign in once per role and log out again — the demo scenario from the
    brief works for all four roles.
