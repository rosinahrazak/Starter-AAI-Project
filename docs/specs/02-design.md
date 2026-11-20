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
