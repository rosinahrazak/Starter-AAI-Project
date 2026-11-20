# Login – Design

## 1. Tables

### `User` – one row per person who can log in

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `name` | text | yes | Full name, e.g. "Supervisor 1" |
| `icNumber` | text | yes | Identity card number, format `xx-xxxxxx` (two digits, hyphen, six digits), e.g. `00-148888`. Profile data only — never used to log in |
| `email` | text | yes | Work email, always ends `@budiman.com`. **Unique.** Used to log in |
| `password` | text | yes | bcrypt hash of the password (cost 10, bcryptjs). Never plain text, never shown anywhere |
| `role` | text | yes | Exactly one of `EMPLOYEE`, `SUPERVISOR`, `HR`, `ADMIN`. SQLite has no enum type, so Prisma stores a string; TypeScript (a `Role` union) and the seed enforce the four values |
| `division` | text | yes | One of the divisions in Reference A |
| `designation` | text | yes | Job title from the chosen division (Reference A) |
| `createdAt` | date | auto | Set by the system when the row is created |

Divisions and designations are fixed choices (Reference A), not separate
tables — nothing in login needs to add or edit them.

## 2. Business rules

1. **Work email only.** An email that does not end `@budiman.com` is refused
   on the form and again on the server before any password check (AC-04).
2. **Email is unique.** No two accounts can share an email.
3. **Passwords are hashed.** Stored with bcryptjs (cost 10); never plain text,
   never in logs, never shown on screen.
4. **One role per user.** `EMPLOYEE`, `SUPERVISOR`, `HR` or `ADMIN`. The role
   decides which pages open (rule 7).
5. **Generic login failure.** A wrong email or wrong password always gives the
   one message "Incorrect email or password". No hint about which part failed,
   no lockout (decided in interview; AC-03).
6. **Session cookie.** On successful login the server sets a signed cookie
   (HMAC-SHA256) holding the user id, role and expiry: `HttpOnly`,
   `SameSite=Lax`, `Max-Age=28800` (8 hours), path `/`. An expired, tampered
   or forged cookie counts as logged out — the signature is re-checked on
   every request (AC-07, AC-08).
7. **Every page and action is checked on the server.** Proxy (Next.js 16's
   renamed middleware) rejects logged-out visitors and shows the 403 screen
   for the wrong role; pages and server actions check again before doing
   anything. Links and buttons are convenience, never the actual check
   (FR-01, AC-05, AC-06).
8. **Guests are sent to login and returned.** A logged-out user opening a
   protected page goes to `/login?next=<that page>` and, after login, lands
   there. `next` must be a plain internal path of the user's own role,
   otherwise they go to their home page (blocks open redirects).
9. **Wrong role sees the 403 screen.** `/unauthorised` says "You are not
   authorised to view this page" with a link back to the user's own home,
   and shows no request data (AC-06).
10. **One-click logout.** The header's "Log out" button runs a server action
    that deletes the session cookie and returns to `/login` with
    "You have been logged out." Back/forward navigation and direct URLs must
    not show protected data (AC-09).
11. **No self-service accounts.** No registration, no change/reset password,
    no failed-attempt lockout (requirements §5).
12. **Fixed demo accounts.** The six users in Reference B are created by the
    seed, all with password `password123` stored as a bcrypt hash (AC-10).
13. **The signing secret is a secret.** `SESSION_SECRET` (32+ characters) lives
    in `.env`, which is not committed. Losing or leaking it means sessions can
    be forged, so it is rotated if that ever happens.

## 3. Technology

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | Next.js 16 (App Router) + TypeScript | Screens and server logic in one project; the login and logout forms post to server actions |
| Database | SQLite with Prisma | One file, no database server to install |
| Styling | Tailwind CSS 4 | Styles sit next to each screen |
| Password hashing | bcryptjs (cost 10) | Salted hashes, per brief §7.1 |
| Session | Signed cookie via `jose` (HMAC-SHA256), verified in proxy | Stateless — no session table; tampering is detectable. `jose` is one small new dependency to approve (it is the session library the Next.js docs recommend) |
| Secret | `SESSION_SECRET` in `.env` | Signs the cookie; never in the code or git |

## 4. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/` | anyone | Redirects: logged in → that role's home; logged out → `/login` | To do |
| `/login` | visitor | Email + password form, error "Incorrect email or password", "You have been logged out." notice. Already-logged-in users are redirected to their own home | To do |
| `/employee` | Employee | Placeholder home page (own requests come with the leave module) | To do |
| `/supervisor` | Supervisor | Placeholder home page (signing queue comes later) | To do |
| `/hr` | HR | Placeholder home page (HR queue comes later) | To do |
| `/admin` | Admin | Placeholder home page (read-only list comes later) | To do |
| `/unauthorised` | logged in, any role | "You are not authorised to view this page" + link back to own home (AC-06) | To do |

Every page except `/login` carries the header with the user's name and a
"Log out" button (U4).

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | The `User` model (role stored as a string, constrained to the four roles in TypeScript) |
| `prisma/seed.ts` | The six demo users (Reference B), hashed with bcryptjs |
| `src/lib/session.ts` | Create, sign and verify the session cookie; role → home page map |
| `src/lib/db.ts` | One shared Prisma client |
| `src/lib/auth.ts` | `requireUser()` / `requireRole()` used by pages and server actions |
| `src/proxy.ts` | Verifies the cookie on every route; guest → `/login?next=…`, wrong role → `/unauthorised` (Next.js 16 renamed middleware to proxy — see its docs) |
| `src/app/layout.tsx` | Shell + header (user name, "Log out" server action) |
| `src/app/page.tsx` | The `/` redirect |
| `src/app/login/page.tsx` | The login screen: form, error message, logout notice |
| `src/app/login/login-form.tsx` | The form itself (client component for `useActionState`) |
| `src/app/login/actions.ts` | Server actions: `login` (check credentials, set cookie) and `logout` (clear cookie) |
| `src/app/employee/page.tsx` | Employee placeholder home |
| `src/app/supervisor/page.tsx` | Supervisor placeholder home |
| `src/app/hr/page.tsx` | HR placeholder home |
| `src/app/admin/page.tsx` | Admin placeholder home |
| `src/app/unauthorised/page.tsx` | The 403 screen |
| `.env` (not in git) | `DATABASE_URL`, `SESSION_SECRET` |

Before writing any of these, the AI reads the matching guide in
`node_modules/next/dist/docs/` — this Next.js version differs from older
conventions.

## 6. Security (in plain words)

- **Every page checks** the signed session cookie in middleware; every page
  and server action then checks again that the user is logged in and holds
  the role that route needs (rules 6–7).
- **Login itself is checked on the server**: email format, then bcrypt
  compare. The error never reveals whether the email or the password was
  wrong; no user data exists for an unknown email, and the wording is
  identical for both cases (OWASP A07).
- **Passwords** are bcrypt hashes only (rule 3); Prisma Studio or the SQLite
  file must never show `password123` (AC-10).
- **The cookie** is `HttpOnly` (JavaScript can't read it), `SameSite=Lax`
  (cross-site POSTs don't carry it), and expires after 8 hours; its signature
  is verified before anything in it is trusted (AC-07, AC-08).
- **`next` redirects** accept only plain internal paths of the user's own
  role, so a login page can't be used to bounce someone off-site.
- **No lockout** by decision (interview Q2) — recorded in requirements §5 so
  it is a known, accepted gap for this laptop demo.

## 7. Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install the pinned dependencies (adds `jose` after approval) |
| `npx prisma db push` | Create the SQLite file and the `User` table |
| `npx prisma db seed` | Load the six demo users with hashed passwords |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run lint` | Check the code style — must pass before finishing |
| `npx prisma studio` | Open the database to check passwords are hashed (AC-10) |

## 8. Look and feel (visual reference)

Visual reference: the sunset-mountain mockup the team provided (image of the
login screen). This section changes **appearance only** — routes, checks,
behaviour and the exact message wordings named in the acceptance checks
("Incorrect email or password", "You have been logged out.", "You are not
authorised to view this page", "Log out") are untouched.

- **Backdrop.** Every screen sits on a full-page sunset gradient rendered in
  CSS (`.sunset-bg` in `src/app/globals.css`): deep purple at the top, hot
  pink in the middle, a warm peach band at the horizon, indigo foreground.
  No image file is used — the attached JPG is a mockup screenshot with its
  own UI baked in, not a clean backdrop.
- **Frosted-glass card** (`.glass-card`): login card, the four role homes and
  the 403 screen each put their content in one centred card — 1 px
  translucent-white border, ~18 % white fill, background blur, 24 px rounded
  corners, soft drop shadow, generous padding (≈2rem). Login card ≈ 384 px
  wide (`max-w-sm`), home/403 cards ≈ 512 px (`max-w-lg`).
- **Header (logged in only).** Sits transparent on the gradient in white
  text: brand "Budiman HRMS" left; user name and "Log out" right. The
  "Log out" button reuses the mockup's outlined-button look: white text,
  1 px translucent-white border, 8 px corners, faint white fill on hover.
- **Login form.** Labels stay on the fields for screen readers (`sr-only`)
  and the mockup's in-field placeholders ("Email", "Password") are shown;
  inputs are transparent with a bottom border only, and envelope/lock icons
  sit right-aligned inside them (inline SVG). Submit button: mockup purple
  (Tailwind `purple-800`), white semibold label, 8 px corners, full width.
- **Status messages** keep their roles (`status`/`alert`) and wordings, now
  as pills inside the card: green (`emerald-600`) for the logout notice, red
  (`red-600`) for the login error, white text.
- **Type.** Card titles bold dark navy (`indigo-950`) as in the mockup;
  supporting text the same navy at reduced opacity.

**Deliberately not copied from the mockup:** the "Remember me" checkbox,
"Forget Password" and "Register" links, and the card's close (×) button.
Those features are out of scope (requirements §5, business rule 11);
showing non-working controls would mislead users (interview decision).

---

# Leave Request – Design

## 1. Tables

### `LeaveType` – the five fixed choices from brief §7.2

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `code` | text | yes | One of `ANNUAL`, `MATERNITY`, `UNPAID`, `COMPASSIONATE`, `OTHER`. **Unique** |
| `label` | text | yes | Shown on the form: "Annual leave", "Maternity leave", "Unpaid leave", "Compassionate leave", "Other" |

Like divisions/designations, these are fixed reference data — created by the
seed, never edited from the UI (the brief gives no screen for editing them).
The `OTHER` rule (description required) is enforced in code, not in the table.

### `LeaveRequest` – one row per request

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `employeeId` | number | yes | The user asking for leave. **Links to `User`** (brief §7.2) |
| `supervisorId` | number | yes | The user who must sign. **Links to `User`**; at submit the server checks the user's role is `SUPERVISOR` and their division equals the employee's (§5.3 rule 3) |
| `leaveTypeId` | number | yes | **Links to `LeaveType`** |
| `otherLeaveType` | text | only for `OTHER` | "What the leave is for" — required by the form and server when the type is Other, empty otherwise (§7.2) |
| `startDate` | date | yes | First day of leave; today or later |
| `endDate` | date | yes | Last day; not before `startDate` (§7.2) |
| `daysCount` | number | yes | Working days between the dates, Saturdays and Sundays excluded; computed on the server at submit, never taken from the form (interview answer; spec decision — the brief leaves exact fields to the spec) |
| `status` | text | yes | One of the six statuses (§2 below). SQLite has no enum, so Prisma stores a string; a TypeScript union constrains it, like `role` |
| `supervisorRemark` | text | on reject | The supervisor's reason; required when rejecting (§7.2) |
| `hrOfficerId` | number | on HR decision | The HR user who approved or rejected. **Links to `User`**; set automatically (§7.2) |
| `hrRemark` | text | on HR reject | HR's reason; required when rejecting (§7.2) |
| `submittedAt` | date | auto | Set when the employee submits |
| `signedAt` | date | auto | Set when the supervisor signs or rejects |
| `sentToHrAt` | date | auto | Set when the employee sends it to HR |
| `decidedAt` | date | auto | Set when HR approves or rejects (§7.2 "Dates: submitted, signed and decided") |

## 2. Statuses

Stored strings and shown labels (identical to requirements §2, from brief §5.2):

| Stored | Shown | Terminal? |
|--------|-------|-----------|
| `PENDING_SUPERVISOR` | Pending supervisor | no |
| `SIGNED` | Signed | no |
| `PENDING_HR` | Pending HR | no |
| `APPROVED` | Approved | **yes** |
| `REJECTED_BY_SUPERVISOR` | Rejected by supervisor | **yes** |
| `REJECTED_BY_HR` | Rejected by HR | **yes** |

## 3. Business rules

1. **Logged-in and role-gated.** Inherited from login: proxy gates the pages;
   every server action below also calls `requireUser()` / `requireRole()`.
2. **Only employees submit.** Supervisors, HR and admin have no submit form
   (§5.3 rule 2).
3. **Supervisor from own division.** The form lists `User` rows with role
   `SUPERVISOR` in the employee's division; the server re-checks role and
   division on submit (§5.3 rule 3, FR-02) — a missing choice, a non-supervisor
   id or a supervisor from another division is refused with "Please choose a
   supervisor from your own division." With the seed, `employee-1`
   (Finance) sees both Supervisor 1 and 2. Divisions without a supervisor
   simply have nobody to pick — accepted for the demo.
4. **Every request goes to the supervisor first.** New rows start at
   `PENDING_SUPERVISOR`; there is no way to create a row in any other status
   (§5.3 rule 4).
5. **Only these moves exist** — every server action re-reads the row from the
   database and refuses anything else (FR-10, AC-22):

   | From | To | Who | Extra check |
   |------|----|-----|-------------|
   | `PENDING_SUPERVISOR` | `SIGNED` | the assigned supervisor | — |
   | `PENDING_SUPERVISOR` | `REJECTED_BY_SUPERVISOR` | the assigned supervisor | remark not empty |
   | `SIGNED` | `PENDING_HR` | the owning employee only | — |
   | `PENDING_HR` | `APPROVED` | any HR officer | — |
   | `PENDING_HR` | `REJECTED_BY_HR` | any HR officer | remark not empty |

   Refusal message: "You cannot act on this request."; if the row is already
   terminal: "This request has already been decided."
6. **Final is final.** The three terminal statuses accept no further action
   from anyone, including the owner and HR (requirements U19).
7. **Either HR officer decides** the shared queue, and `hrOfficerId` records
   who (§5.3 rule 5).
8. **Rejections always carry a remark**, checked on the form and again on the
   server (§6 FR-03/FR-05).
9. **Dates.** Start date is today or later; end ≥ start; `daysCount` counts
   working days excluding Saturdays and Sundays, computed server-side
   (interview answer). No half days, no holiday calendar.
10. **Other needs a description.** `otherLeaveType` is required when the type
    is Other and ignored otherwise (§7.2).
11. **Confirm then success** (FR-07). *Every* action — including submit —
    shows a confirm dialog first and, on success, shows exactly one of the
    named messages (requirements §4): "Leave request submitted.",
    "Request signed — waiting for the employee to send it to HR.",
    "Request rejected — the employee can see your reason." (both rejections),
    "Request sent to HR.", "Request approved."
12. **Admin is read-only.** `/admin` renders lists only; there is no admin
    server action to call (§5.3 rule 6).
13. **The server is the boss.** Buttons are hidden by status/role as
    convenience; every server action independently checks role, ownership or
    assignment, current status **re-read from the database** (not trusted
    from the form), and required remarks. A hidden button is never a
    permission.

## 4. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/employee` | Employee | Own requests (newest first): type, dates, days, status pill, remarks; "New request" button; "Send to HR" on Signed rows (with confirm + success) | To do |
| `/employee/leave/new` | Employee | Submit form: supervisor (own division), leave type, start/end dates, "Other" description (shown when type = Other); error messages per AC-12 | To do |
| `/supervisor` | Supervisor | "For you to sign" list (Pending supervisor addressed to me) with Sign / Reject + remark; below, my decided requests | To do |
| `/hr` | HR | Shared queue (Pending HR) with Approve / Reject + remark; below, decided requests with the deciding officer named | To do |
| `/admin` | Admin | Every request, read-only: employee, supervisor, type, dates, days, status, remarks, deciding officer. No controls that change data | To do |

The four role home pages are rewritten from placeholders to these screens.
One gap to close against the login spec: the current `src/proxy.ts` gates by
the *exact* role home paths only (`/employee`, `/supervisor`, `/hr`,
`/admin`), so the new nested route `/employee/leave/new` would let any
logged-in role through the proxy. The proxy's route map is therefore
extended to cover `/employee/leave/*` as EMPLOYEE-only (design §6); the
page- and action-level checks of rule 13 remain the real enforcement and are
otherwise exactly as the login spec defines them.

## 5. Who can do what

| Action | Employee | Supervisor | HR | Admin |
|--------|----------|------------|----|-------|
| Submit a request (own, choosing own-division supervisor) | ✔ own | — | — | — |
| See requests | own only | addressed to them | all that reached HR | everything |
| Sign / reject | — | their pending only | — | — |
| Send to HR | own Signed only | — | — | — |
| Approve / reject | — | — | any HR officer | — |
| Decide who decided is recorded as | — | — | `hrOfficerId` | — |
| Change anything | own flow only | own flow only | own flow only | **never** |

## 6. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | add `LeaveType` and `LeaveRequest` models (relations to `User`) |
| `prisma/seed.ts` | extend: upsert the five leave types (users untouched) |
| `src/lib/leave.ts` | working-day count, date validation, status union + labels/colours, allowed-transition map used by all actions |
| `src/proxy.ts` | extend the role-route map so `/employee/leave/*` is EMPLOYEE-only (existing login-era checks unchanged) |
| `src/app/employee/page.tsx` | own-requests list + "Send to HR" (rewritten placeholder) |
| `src/app/employee/leave/new/page.tsx` | submit form |
| `src/app/employee/actions.ts` | server actions: `submitLeaveRequest`, `sendToHr` |
| `src/app/supervisor/page.tsx` | signing queue (rewritten placeholder) |
| `src/app/supervisor/actions.ts` | `signRequest`, `rejectRequest` |
| `src/app/hr/page.tsx` | HR queue (rewritten placeholder) |
| `src/app/hr/actions.ts` | `approveRequest`, `rejectRequestHr` |
| `src/app/admin/page.tsx` | read-only list of everything (rewritten placeholder) |
| `src/components/leave/` | shared table + status pill used by the five screens |

Before writing any of these, the AI reads the matching guide in
`node_modules/next/dist/docs/` — this Next.js version differs from older
conventions.

## 7. Security (in plain words, brief §7.5 / OWASP Top 10)

- **Broken access control (A01):** every page and action re-checks role and
  ownership/assignment; the transition table (§3 rule 5) is applied against
  the row as it is in the database *now*, so a stale tab or forged POST
  cannot skip a step or double-decide (AC-22).
- **Injection (A03):** all reads/writes go through Prisma (parameterised);
  remarks are plain data, rendered escaped by React.
- **Tampering with form data (A01/A04):** `daysCount`, statuses, ids and
  timestamps are set by the server only; the form sends type, dates,
  supervisor id and remarks, and each is validated server-side.
- **UI honesty (A05):** no buttons exist on `/admin`, so nothing to hide
  behind an access check that could mislead.
- The login spec's security rules (signed cookie, hashed passwords, server
  checks on every route) apply unchanged to every new page and action.

## 8. Commands

| Command | What it does |
|---------|--------------|
| `npx prisma db push` | Create the `LeaveType` and `LeaveRequest` tables |
| `npx prisma db seed` | Load the five leave types alongside the six demo users |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run lint` | Check the code style — must pass before finishing |
| `npx prisma studio` | Inspect requests, statuses and remarks by hand |

## 9. Look and feel

Same sunset gradient and glass cards as the login spec §8 (appearance only;
statuses, wordings and checks are untouched):

- **Lists** sit in a `max-w-lg`→`max-w-4xl` glass card, one row per request.
- **Status pill**, one per row: Pending supervisor amber, Signed blue,
  Pending HR violet, Approved green (`emerald-600`), both Rejected red
  (`red-600`) — white text, rounded-full, same family as the login pills.
- **Action buttons** reuse the mockup's outlined-button look; the destructive
  Reject/decline variant uses a translucent red border.
- **Confirm step** uses the browser `confirm()` dialog (plain, reliable for
  the demo); success messages reuse the green pill, errors the red pill.
- Remarks and names are shown as text, never as HTML (escaped by React).

---

# Reference

## Reference A. Fixed lists

- **Roles:** Employee, Supervisor, HR, Admin
- **Email rule:** must end `@budiman.com`, unique per user
- **Divisions and designations:**
  - **Finance:** Finance Manager, Accountant, Accounts Clerk
  - **Human Resources:** HR Manager, HR Officer, HR Assistant
  - **Information Technology:** IT Manager, Software Developer, IT Support Officer
  - **Operations:** Operations Manager, Operations Supervisor, Operations Executive
  - **Marketing:** Marketing Manager, Marketing Executive, Marketing Assistant
  - **Admin:** Admin Manager

## Reference B. Demo data (seeded; everyone logs in with `password123`, stored hashed)

| Email | Name | IC No. | Role | Division | Designation |
|-------|------|--------|------|----------|-------------|
| `employee-1@budiman.com` | Employee 1 | 00-148888 | Employee | Finance | Accounts Clerk |
| `supervisor-1@budiman.com` | Supervisor 1 | 00-157777 | Supervisor | Finance | Finance Manager |
| `supervisor-2@budiman.com` | Supervisor 2 | 00-166666 | Supervisor | Finance | Accountant |
| `hr-1@budiman.com` | HR 1 | 00-175555 | HR | Human Resources | HR Officer |
| `hr-2@budiman.com` | HR 2 | 00-184444 | HR | Human Resources | HR Officer |
| `admin@budiman.com` | Admin | 00-193333 | Admin | Admin | Admin Manager |
