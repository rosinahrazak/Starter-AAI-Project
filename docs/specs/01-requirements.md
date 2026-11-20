# Login – Requirements

## 1. The problem

Budiman HRMS replaces a paper leave process, so the system must know *who* is
using it and *what* they may see: employees act on their own requests,
supervisors and HR decide, and the admin only views. Without login there is no
way to enforce the per-role rules of the brief (FR-01, §5.3 rule 1) or the
security rules in §7.5 (OWASP Top 10).

This module provides:

1. A login page using work email + password
2. A signed session cookie (8 hours) identifying the logged-in user
3. One home page per role, and page access limited to the right role
4. A logout button on every page
5. Six seeded demo accounts with bcrypt-hashed passwords

## 2. Who uses it (roles)

| Role | Home page | What they do |
|------|-----------|--------------|
| **Employee** | `/employee` | Logs in, sees own requests (later), logs out |
| **Supervisor** | `/supervisor` | Logs in, sees requests to sign (later), logs out |
| **HR** | `/hr` | Logs in, sees the HR queue (later), logs out |
| **Admin** | `/admin` | Logs in, sees all records read-only (later), logs out |
| **Visitor** | `/login` | Not logged in: the only page they can open |

## 3. User stories

- **U1. Sign in** *(High)*. As an employee, I can log in with my `@budiman.com`
  email and password so that the system knows who I am and opens my role's
  home page.
- **U2. Right home for each role** *(High)*. As a supervisor, HR officer or
  admin, I land on my own home page after login so that I start at the work
  that is mine.
- **U3. Generic failure** *(High)*. As a user, I see one message —
  "Incorrect email or password" — when either part is wrong, so the system
  never reveals which part failed (§7.5, OWASP A07).
- **U4. One-click logout** *(High)*. As any user, I can click "Log out" in the
  header to end my session immediately, returning to `/login` with
  "You have been logged out."
- **U5. Role-based page access** *(High)*. As the system, I send logged-out
  visitors to `/login` (then back to the page they asked for) and show a
  "You are not authorised to view this page" screen with a link home when the
  logged-in user opens another role's page (FR-01).
- **U6. Time-limited session** *(High)*. As the system, I expire the signed
  session cookie 8 hours after login (`Max-Age=28800`, `HttpOnly`,
  `SameSite=Lax`) so a stolen or forgotten session can't last forever.
- **U7. Demo accounts** *(High)*. As a developer or demo user, the six users
  from §7.2 exist from the seed with `password123` stored only as a bcrypt
  hash, so anyone can sign in the same way.
- **U8. Return to intended page** *(Medium)*. As a user sent to the login page
  from a protected page, I continue to that page after logging in so I don't
  lose my place.
- **U9. Friendly notices** *(Medium)*. As a user, I see clear messages after
  logout and on the 403 screen so I always know what happened and where to go
  next.

## 4. Acceptance checklist

All tests use the demo password `password123` and the seeded accounts
(`employee-1@budiman.com`, `supervisor-1@budiman.com`, `hr-1@budiman.com`,
`admin@budiman.com`).

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| To do | AC-01 | Valid login opens the role's home page | • Go to `/login`<br>• Sign in as `employee-1@budiman.com`<br>• See the `/employee` home page |
| To do | AC-02 | Each role lands on its own page | • Repeat AC-01 for `supervisor-1@budiman.com` → `/supervisor`, `hr-1@budiman.com` → `/hr`, `admin@budiman.com` → `/admin` |
| To do | AC-03 | Wrong password and unknown email give the identical generic message | • Sign in as `hr-1@budiman.com` with a wrong password → "Incorrect email or password"<br>• Sign in as `nobody@budiman.com` with any password → same message, same wording |
| To do | AC-04 | Non-work emails are refused at the form | • Type `siti@gmail.com` in the email field<br>• Asked for a `@budiman.com` work email before any login is attempted |
| To do | AC-05 | Logged-out visitor is redirected, then returned | • Log out<br>• Open `/hr` directly → see `/login`<br>• Sign in as `hr-1@budiman.com` → land on `/hr` |
| To do | AC-06 | Wrong role sees the 403 screen, not the page | • Sign in as `employee-1@budiman.com`<br>• Open `/hr` directly → "You are not authorised to view this page" plus a link back to `/employee`<br>• No request data shown |
| To do | AC-07 | A tampered or forged cookie is treated as logged out | • Sign in as `employee-1@budiman.com`<br>• In dev tools, change any character of the session cookie<br>• Open `/employee` → redirected to `/login` |
| To do | AC-08 | Session cookie carries the right flags and lifetime | • After login, dev tools → Application → Cookies<br>• Session cookie shows `HttpOnly`, `SameSite=Lax`, `Max-Age=28800` |
| To do | AC-09 | Logout ends the session everywhere in the tab | • Sign in, click "Log out" → `/login` with "You have been logged out."<br>• Press browser Back, or re-open `/employee` → still taken to `/login` |
| To do | AC-10 | Passwords are stored hashed only | • Open the SQLite DB (e.g. `npx prisma studio`) → Users<br>• The `password` field shows a bcrypt hash (`$2a$…`), never `password123` |

## 5. Not included (for now)

- Self-registration and change/reset password (interview Q5 — specification
  first if ever needed)
- Failed-attempt lockout or rate limiting (interview Q2 — decided out; recorded
  here so nothing gets added later)
- Multi-factor authentication
- "Remember me" option
- Any page beyond `/login`, the four role home pages (empty placeholders until
  the leave-request module), and the 403 screen
