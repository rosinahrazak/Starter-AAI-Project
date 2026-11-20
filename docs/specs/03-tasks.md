# Login – Tasks

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| Done | 1 | Prisma setup + Users table | High | AC-10 (table part) |
| Done | 2 | Seed the six demo users | High | AC-10 |
| Done | 3 | Session library (sign / verify cookie) | High | AC-07, AC-08 (library part) |
| Done | 4 | Login form + server action | High | AC-01, AC-03, AC-04 |
| Done | 5 | Role home pages + `/` redirect | High | AC-01, AC-02 |
| Done | 6 | Proxy gate + `/unauthorised` screen | High | AC-05 (redirect part), AC-06, AC-07 |
| Done | 7 | Return to the page asked for | Medium | AC-05 (return part) |
| Done | 8 | Header + one-click logout | High | AC-09 |
| Done | 9 | Full check against the specs | High | All ACs + `npm run lint` |

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
    `email` marked unique, `role` a string constrained to the four roles in
    TypeScript, and zero rows.

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

## Task 6 – Proxy gate + `/unauthorised` screen *(High)*

- **Goal:** Every route is gated in one place before the page runs: no valid
  session → `/login`, valid session but wrong role → `/unauthorised`, which
  explains the refusal and links home.
- **Files:** `src/proxy.ts` (new — Next.js 16 renamed middleware to proxy),
  `src/app/unauthorised/page.tsx` (new).
- **From:** U5, U9; AC-05 (redirect part), AC-06, AC-07; design §4
  (`/unauthorised`), rules 7–9, §5 (`src/proxy.ts`); brief FR-01.
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
  handling); proxy passes `next` as a query parameter.
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

---

# Leave Request – Tasks

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask. No Low tasks in this
module for now (brief FR-09: extra features need a spec first).

Tasks 1–9 (login) are Done; this module continues the numbering.

| Status | # | Task | Priority | Checks (from requirements §5) |
|--------|---|------|----------|-------------------------------|
| Done | 10 | LeaveType + LeaveRequest tables | High | AC-11 (tables part) |
| Done | 11 | Seed the five leave types | High | AC-11 (types part) |
| Done | 12 | Submit form + working-day count | High | AC-11, AC-12, AC-13 |
| Done | 13 | Employee list with statuses and remarks | High | AC-20 (employee part) |
| Done | 14 | Send to HR | High | AC-17 |
| Done | 15 | Supervisor queue — sign and reject | High | AC-14, AC-15, AC-16 |
| Done | 16 | HR queue — approve and reject | High | AC-18, AC-19 |
| Done | 17 | Admin read-only list | Medium | AC-21 |
| Done | 18 | Full check against the specs | High | AC-11–AC-22 + `npm run lint` |

---

## Task 10 – LeaveType + LeaveRequest tables *(High)*

- **Goal:** The database has both new tables exactly as design §1 defines
  them, empty and ready, with relations to `User`.
- **Files:** `prisma/schema.prisma` (add two models + relations).
- **From:** Design §1 (both tables), §2 (status strings); brief §7.2 (leave
  request fields, leave types).
- **Check:**
  • Run `npx prisma db push`
  • Run `npx prisma studio` → open `LeaveType`, `LeaveRequest`
  • `LeaveType` has `id`, `code` (unique), `label`; zero rows (they come in
    task 11)
  • `LeaveRequest` has every field from design §1 (`employeeId`,
    `supervisorId`, `leaveTypeId`, `otherLeaveType`, `startDate`, `endDate`,
    `daysCount`, `status`, `supervisorRemark`, `hrOfficerId`, `hrRemark`,
    `submittedAt`, `signedAt`, `sentToHrAt`, `decidedAt`); zero rows.

## Task 11 – Seed the five leave types *(High)*

- **Goal:** `npx prisma db seed` loads Annual leave, Maternity leave, Unpaid
  leave, Compassionate leave and Other (codes from design §1) without
  touching the six demo users.
- **Files:** `prisma/seed.ts` (extend with upserts for the five types).
- **From:** AC-11 (types part); design §1 (`LeaveType`), §6 (`prisma/seed.ts`);
  brief §7.2 (the five types and their meanings).
- **Check:**
  • Run `npx prisma db seed` twice → no duplicate rows (upsert, not insert)
  • `npx prisma studio` → `LeaveType` shows exactly five rows with the right
    codes and labels; `User` still shows the same six demo users.

## Task 12 – Submit form + working-day count *(High)*

- **Goal:** `employee-1` can submit from `/employee/leave/new`: dropdown of
  own-division supervisors only, the five leave types, date pickers, an
  "Other" description that appears only for type Other; the server validates
  everything, computes `daysCount` (weekends excluded), and shows
  "Leave request submitted."
- **Files:** `src/app/employee/leave/new/page.tsx`,
  `src/app/employee/actions.ts` (`submitLeaveRequest`), `src/lib/leave.ts`
  (day count + validation + status union), `src/proxy.ts` (extend the
  route map so `/employee/leave/*` is EMPLOYEE-only — design §4 note).
- **From:** U10, U11, U12; AC-11–AC-13; design §3 rules 2–4, 9, 10, 13, §4
  (`/employee/leave/new`), §7; brief §5.3 rules 2–4, FR-02.
- **Check:**
  • Sign in as `employee-1` → supervisor dropdown shows only Supervisor 1
    and Supervisor 2 (AC-11)
  • Click Submit → confirm prompt appears; Cancel saves nothing (FR-07)
  • End before start → "End date cannot be before the start date."; start
    yesterday → "Start date cannot be in the past."; Other with empty
    description → "Please describe what the leave is for." No row saved in
    any of the three (AC-12)
  • Submit Tue 2026-12-01 → Mon 2026-12-07 → confirm →
    "Leave request submitted."; in Prisma Studio the row has `daysCount = 5`,
    `status = PENDING_SUPERVISOR`, `submittedAt` set (AC-13)
  • Dev-tools tamper: submit with `supervisorId` set to `hr-1` or to a
    supervisor outside Finance → "Please choose a supervisor from your own
    division." and no row saved (rule 3; AC-22 part)
  • Sign in as `hr-1` and open `/employee/leave/new` directly → 403 screen
    (proxy extension, AC-06 behaviour from login unchanged).

## Task 13 – Employee list with statuses and remarks *(High)*

- **Goal:** `/employee` lists the signed-in user's own requests, newest
  first, with type, dates, days, a coloured status pill and any remarks,
  plus the "New request" link.
- **Files:** `src/app/employee/page.tsx` (rewrite placeholder),
  `src/components/leave/` (shared table + status pill).
- **From:** U17; AC-20 (employee part); design §4 (`/employee`), §9 (pills);
  brief FR-06, §5.2 (status labels).
- **Check:**
  • Sign in as `employee-1` → the request from task 12 is listed with
    "Pending supervisor" pill, correct dates and day count
  • Add a second employee row in Prisma Studio (any `@budiman.com` email,
    role EMPLOYEE) and give them a request → `employee-1` still sees only
    their own rows (AC-20)
  • A supervisor remark entered later (task 15) appears in the employee's
    row.

## Task 14 – Send to HR *(High)*

- **Goal:** On the employee's own list, a "Send to HR" button appears only
  on Signed rows; confirm first, then status `PENDING_HR`, `sentToHrAt`
  set, "Request sent to HR." shown.
- **Files:** `src/app/employee/page.tsx` (button),
  `src/app/employee/actions.ts` (`sendToHr`).
- **From:** U15, U18; AC-17; design §3 rule 5 (SIGNED → PENDING_HR, owner
  only), rule 11; brief §5.3 rule 5, FR-04.
- **Check:**
  • With a `PENDING_SUPERVISOR` row → no button. The supervisor UI arrives
    in task 15; for this task set the row's `status` to `SIGNED` in Prisma
    Studio so the button appears (re-verify once task 15 produces a properly
    signed row)
  • Click → confirm dialog; cancel → status unchanged; confirm →
    "Request sent to HR." and status "Pending HR" (AC-17)
  • Stale tab: after sending in one tab, click "Send to HR" in the other →
    "You cannot act on this request." (early AC-22).

## Task 15 – Supervisor queue — sign and reject *(High)*

- **Goal:** `/supervisor` shows requests addressed to the signed-in
  supervisor in `PENDING_SUPERVISOR`, with Sign and Reject + remark
  (required); decided requests listed below; every action confirms first
  and shows its success message.
- **Files:** `src/app/supervisor/page.tsx` (rewrite placeholder),
  `src/app/supervisor/actions.ts` (`signRequest`, `rejectRequest`).
- **From:** U13, U14, U18; AC-14–AC-16; design §3 rules 5, 8, 11, 13, §4
  (`/supervisor`); brief §4 (supervisor row), §5.3 rule 4, FR-03.
- **Check:**
  • `employee-1` submits to Supervisor 2 → `supervisor-1`'s queue does not
    list it; `supervisor-2`'s does (AC-14)
  • Sign with confirm → "Request signed — waiting for the employee to send
    it to HR.", status Signed (AC-15); cancel leaves it unchanged
  • Reject with empty remark → "Please give a reason for rejecting."; with a
    remark → "Request rejected — the employee can see your reason.", status
    "Rejected by supervisor", `supervisorRemark` and `signedAt` set in
    Studio; `employee-1` sees the remark (AC-16)
  • `supervisor-1` copies the sign-action URL from dev tools and replays it
    on Supervisor 2's request → refused (rule 13, early AC-22).

## Task 16 – HR queue — approve and reject *(High)*

- **Goal:** `/hr` shows both HR officers every `PENDING_HR` request
  (shared queue) with Approve and Reject + remark (required); decided
  requests below, naming the officer who decided; confirm + success per
  action.
- **Files:** `src/app/hr/page.tsx` (rewrite placeholder),
  `src/app/hr/actions.ts` (`approveRequest`, `rejectRequestHr`).
- **From:** U16, U18; AC-18, AC-19; design §3 rules 5, 7, 8, 11, 13, §4
  (`/hr`); brief §5.3 rule 5, FR-05.
- **Check:**
  • Send a request to HR → both `hr-1` and `hr-2` see it in the queue
    (AC-18)
  • `hr-1` approves with confirm → "Request approved.", status Approved,
    Studio shows `hrOfficerId` = HR 1 and `decidedAt` set (AC-18)
  • `hr-2` rejects another request: empty remark refused → "Please give a
    reason for rejecting."; with remark → "Request rejected — the employee
    can see your reason.", status "Rejected by HR", remark visible to
    `employee-1` (AC-19)
  • Approve an already-decided request from a stale tab → "This request has
    already been decided." (AC-22 part).

## Task 17 – Admin read-only list *(Medium)*

- **Goal:** `/admin` lists every request from every user, with employee,
  supervisor, type, dates, days, status, both remarks and the deciding
  officer — and has no control that changes anything.
- **Files:** `src/app/admin/page.tsx` (rewrite placeholder), reuse
  `src/components/leave/`.
- **From:** U20; AC-21; design §3 rule 12, §4 (`/admin`), §7 (UI honesty);
  brief §5.3 rule 6, FR-08.
- **Check:**
  • Sign in as `admin@budiman.com` → every request seeded during tasks
    12–16 is listed with all columns filled in (AC-21)
  • The page contains no buttons or forms other than the header "Log out"
  • Sign in as `employee-1` and open `/admin` directly → 403 screen (proxy,
    unchanged from login).

## Task 18 – Full check against the specs *(High)*

- **Goal:** The whole leave module is walked through with the specs open,
  lint passes, and every leave story and acceptance check is demonstrated.
- **Files:** none new — fixes only, and only after fixing the spec if
  behaviour and spec disagree (AGENTS.md: spec first).
- **From:** Leave stories U10–U20; leave requirements §5 end to end; brief
  §8 step "Check"; AGENTS.md ("`npm run lint` must pass").
- **Check:**
  • Run `npm run lint` → no errors
  • Run every AC-11…AC-22 with the demo accounts, ticking the Status column
    as you go
  • Run the brief's full scenario once end to end: employee submits →
    supervisor signs → employee sends to HR → HR approves; then a second
    scenario with a supervisor rejection and one with an HR rejection —
    all three end in the right terminal status with remarks where required
  • Re-run the login ACs (AC-01…AC-10) once to be sure the rewritten home
    pages didn't break login behaviour.
