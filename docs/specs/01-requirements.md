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
| Done | AC-01 | Valid login opens the role's home page | • Go to `/login`<br>• Sign in as `employee-1@budiman.com`<br>• See the `/employee` home page |
| Done | AC-02 | Each role lands on its own page | • Repeat AC-01 for `supervisor-1@budiman.com` → `/supervisor`, `hr-1@budiman.com` → `/hr`, `admin@budiman.com` → `/admin` |
| Done | AC-03 | Wrong password and unknown email give the identical generic message | • Sign in as `hr-1@budiman.com` with a wrong password → "Incorrect email or password"<br>• Sign in as `nobody@budiman.com` with any password → same message, same wording |
| Done | AC-04 | Non-work emails are refused at the form | • Type `siti@gmail.com` in the email field<br>• Asked for a `@budiman.com` work email before any login is attempted |
| Done | AC-05 | Logged-out visitor is redirected, then returned | • Log out<br>• Open `/hr` directly → see `/login`<br>• Sign in as `hr-1@budiman.com` → land on `/hr` |
| Done | AC-06 | Wrong role sees the 403 screen, not the page | • Sign in as `employee-1@budiman.com`<br>• Open `/hr` directly → "You are not authorised to view this page" plus a link back to `/employee`<br>• No request data shown |
| Done | AC-07 | A tampered or forged cookie is treated as logged out | • Sign in as `employee-1@budiman.com`<br>• In dev tools, change any character of the session cookie<br>• Open `/employee` → redirected to `/login` |
| Done | AC-08 | Session cookie carries the right flags and lifetime | • After login, dev tools → Application → Cookies<br>• Session cookie shows `HttpOnly`, `SameSite=Lax`, `Max-Age=28800` |
| Done | AC-09 | Logout ends the session everywhere in the tab | • Sign in, click "Log out" → `/login` with "You have been logged out."<br>• Press browser Back, or re-open `/employee` → still taken to `/login` |
| Done | AC-10 | Passwords are stored hashed only | • Open the SQLite DB (e.g. `npx prisma studio`) → Users<br>• The `password` field shows a bcrypt hash (`$2a$…`), never `password123` |

## 5. Not included (for now)

- Self-registration and change/reset password (interview Q5 — specification
  first if ever needed)
- Failed-attempt lockout or rate limiting (interview Q2 — decided out; recorded
  here so nothing gets added later)
- Multi-factor authentication
- "Remember me" option
- Any page beyond `/login`, the four role home pages (empty placeholders until
  the leave-request module), and the 403 screen

---

# Leave Request – Requirements

## 1. The problem

Login works, but leave is still on paper: forms get lost, employees cannot
see where their request is, and HR has no single list waiting for a decision
(brief §2). This module is the rest of the brief's scope (§1.2): the full
leave request flow — employee submits, supervisor signs or rejects (with a
reason), employee sends the signed request to HR, HR approves or rejects
(with a reason), admin sees everything read-only (FR-02…FR-08, FR-10).

## 2. The flow (brief §5.1–5.2)

Six statuses, exactly as the brief names them:

| Status (shown on screen) | Meaning |
|--------------------------|---------|
| Pending supervisor | Submitted. Waiting for the supervisor |
| Signed | The supervisor signed it. The employee can now send it to HR |
| Pending HR | Sent to HR. Waiting for a decision |
| Approved | HR approved it. **Final** |
| Rejected by supervisor | The supervisor rejected it, with a reason. **Final** |
| Rejected by HR | HR rejected it, with a reason. **Final** |

```
submit ──► Pending supervisor ──sign──► Signed ──employee sends──► Pending HR ──approve──► Approved
                  │                        (employee can also just wait)         │
                reject                                                          reject
                  ▼                                                                ▼
     Rejected by supervisor                                              Rejected by HR
```

## 3. Who uses it (roles)

| Role | What they do in this module |
|------|---------------------------|
| **Employee** | Submits a request choosing a supervisor **from their own division**; tracks their own requests; sends a signed request to HR |
| **Supervisor** | Signs or rejects the requests addressed to them; rejection needs a remark |
| **HR** | Shared queue: either HR officer approves or rejects; rejection needs a remark; the officer who decided is recorded |
| **Admin** | Sees every leave record. View only — no buttons that change anything |

## 4. User stories

- **U10. Submit a request** *(High, FR-02)*. As an employee, I fill in leave
  type, start and end date, and choose a supervisor from my own division, so
  the right person is asked to sign.
  *Test:* sign in as `employee-1@budiman.com` → `/employee` → "New request".
  The supervisor dropdown shows only Supervisor 1 and Supervisor 2 (my
  division), not HR or Admin. Pick Annual leave, a future range, submit →
  confirm prompt; Cancel leaves nothing saved; confirm → success "Leave
  request submitted." and the row shows "Pending supervisor" (FR-07 covers
  submit too).
- **U11. Bad requests refused** *(High, FR-10/§7.5)*. As the system, I refuse
  an end date before the start date, a start date in the past, and "Other"
  type with no description, so nonsense never enters the register.
  *Test:* in the new-request form try each of the three → the named error
  message appears and nothing is saved.
- **U12. Working-day count** *(Medium, §5.3)*. As an employee, I see the
  request counted in working days (Saturdays and Sundays excluded), so the
  count matches the paper form.
  *Test:* submit From Tue 2026-12-01 To Mon 2026-12-07 → the list shows
  5 days, not 7.
- **U13. Supervisor signs** *(High, FR-03)*. As a supervisor, I see the
  requests sent to me and sign one with a confirmation click.
  *Test:* as `employee-1`, submit to Supervisor 2; sign in as
  `supervisor-1@budiman.com` → it is **not** in my list (it is not addressed
  to me); sign in as `supervisor-2@budiman.com` → it is; click "Sign",
  confirm → "Request signed — waiting for the employee to send it to HR."
- **U14. Supervisor rejects with a reason** *(High, FR-03)*. As a supervisor,
  I must write a remark when rejecting, and the employee sees that reason.
  *Test:* click "Reject" and try to submit with an empty remark →
  "Please give a reason for rejecting." Enter a reason, confirm → success
  "Request rejected — the employee can see your reason."; status
  "Rejected by supervisor" and the employee sees the reason in their list.
- **U15. Send to HR** *(High, FR-04)*. As an employee, once the supervisor
  signs, a "Send to HR" button appears on my request; one click and a
  confirmation puts it in the shared HR queue.
  *Test:* sign in as `employee-1` → the Signed row has a "Send to HR"
  button; a "Pending supervisor" row does not. Click, confirm →
  "Request sent to HR." and status "Pending HR".
- **U16. HR decides** *(High, FR-05)*. As an HR officer, I see every request
  waiting for HR (shared with the other officer), approve or reject one, and
  the system records which officer decided.
  *Test:* sign in as `hr-1@budiman.com` → the Pending HR request is in the
  queue; approve it, confirm → "Request approved." Re-sign in as
  `hr-2@budiman.com` → the same queue showed the request before it was
  decided; the decided row names the officer who decided (HR 1). For a
  rejection the remark is required and, after confirming, the success reads
  "Request rejected — the employee can see your reason." and the status
  becomes "Rejected by HR".
- **U17. Everyone sees their list** *(High, FR-06)*. As each role, I see the
  current and past requests that are mine to see, each with its status and
  any remarks.
  *Test:* employee sees only their own rows; supervisor sees only requests
  addressed to them (pending and decided); both HR officers see all requests
  that reached HR. Every row shows status and remarks.
- **U18. Confirm, then success** *(High, FR-07)*. As any user, every action
  asks me to confirm first and shows a clear success message afterwards, so
  nothing happens by an accidental click.
  *Test:* perform submit, sign, supervisor reject, send-to-HR, approve and
  HR reject — each shows a confirmation prompt beforehand and its success
  message afterwards (FR-07 says *every* action).
- **U19. Final is final** *(High, FR-10/§7.5)*. As the system, I refuse any
  action on an Approved or Rejected request, and I refuse an action by the
  wrong person or in the wrong status — even a forged request from dev
  tools.
  *Test:* open the same decided request in two tabs; the second
  approve/sign attempt fails with "This request has already been decided."
  A tampered action (e.g. employee sending an unsigned request) fails with
  "You cannot act on this request."
- **U20. Admin reads everything** *(Medium, FR-08)*. As the admin, I see
  every leave record with employee, dates, status and remarks, but nothing
  I click can change one.
  *Test:* sign in as `admin@budiman.com` → `/admin` lists requests from all
  seeded users; the page has no Sign/Reject/Send/Approve controls; any
  direct action call from the console is refused.

## 5. Acceptance checklist

All tests use the demo accounts and password `password123` (login spec,
Reference B). Leave types are the five from brief §7.2: Annual leave,
Maternity leave, Unpaid leave, Compassionate leave, Other (description
required).

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| Done | AC-11 | Submit works; only own-division supervisors offered | • Sign in as `employee-1` → `/employee` → "New request"<br>• Supervisor dropdown shows only Supervisor 1 and Supervisor 2<br>• Submit Annual leave, future dates → confirm prompt; Cancel saves nothing<br>• Confirm → "Leave request submitted." and row "Pending supervisor" |
| Done | AC-12 | Invalid form values are refused | • End date before start → "End date cannot be before the start date."<br>• Start date in the past → "Start date cannot be in the past."<br>• Type "Other" with empty description → "Please describe what the leave is for."<br>• No row appears in Prisma Studio after each |
| Done | AC-13 | Days counted exclude weekends | • Submit Tue 2026-12-01 → Mon 2026-12-07<br>• The list shows **5 days** (Sat 5th and Sun 6th excluded) |
| Done | AC-14 | Supervisor queue shows only requests addressed to me | • Submit a request choosing Supervisor 2<br>• `supervisor-1` → `/supervisor`: not listed<br>• `supervisor-2` → `/supervisor`: listed under "Pending supervisor" |
| Done | AC-15 | Sign needs a confirmation and shows success | • `supervisor-2` clicks "Sign" → confirm prompt<br>• Cancel → status unchanged<br>• Confirm → "Request signed — waiting for the employee to send it to HR." and status "Signed" |
| Done | AC-16 | Supervisor rejection needs a remark and tells the employee | • Click "Reject", submit empty → "Please give a reason for rejecting."<br>• Enter a remark, confirm → "Request rejected — the employee can see your reason." and status "Rejected by supervisor"<br>• `employee-1` sees the remark in their list |
| Done | AC-17 | Only the owner can send a Signed request to HR | • `employee-1`: the "Send to HR" button appears only on Signed rows<br>• Confirm → "Request sent to HR." and status "Pending HR"<br>• No such button on Pending supervisor / decided rows |
| Done | AC-18 | HR queue is shared and records the deciding officer | • `hr-1` and `hr-2` both see the Pending HR request<br>• `hr-1` approves → status "Approved"; the row records **HR 1** as the deciding officer |
| Done | AC-19 | HR rejection needs a remark | • `hr-2` clicks "Reject" on a Pending HR request, submit empty → "Please give a reason for rejecting."<br>• Enter a remark → "Request rejected — the employee can see your reason.", status "Rejected by HR", remark visible to the employee |
| Done | AC-20 | Each role's list shows current + past with status and remarks | • `employee-1`: all own requests, none of any other user's (add a second employee row in Prisma Studio to confirm)<br>• `supervisor-2`: only requests addressed to them, pending and decided<br>• `hr-2`: everything that reached HR |
| Done | AC-21 | Admin sees every record, changes nothing | • `admin` → `/admin` lists all requests with employee, dates, type, status, remarks, deciding officer<br>• No action buttons anywhere on the page |
| Done | AC-22 | The server, not the buttons, enforces the flow | • Two tabs, both HR: `hr-1` approves, then `hr-2`'s stale tab approves too → "This request has already been decided."<br>• As `employee-1`, craft a submit-for-others action in dev tools → refused, no change<br>• Dev-tools submit with `supervisorId` of `hr-1` (not a supervisor) or a supervisor from another division → "Please choose a supervisor from your own division.", no row saved<br>• Sign an already-signed request → refused |

## 6. Not included (for now)

- **Edit, cancel or withdraw** a submitted request — not in brief §6; if a
  request is rejected, the employee submits a new one (decided in interview
  round 1; specification first if ever wanted)
- **Leave balances/entitlements** (e.g. "14 days annual per year") — the
  brief sets no allowance rules, so the system does not track or check any
- **Public holidays and half days** — only full days, weekends excluded
  (interview answer; no holiday data source in the brief)
- **Notifications** (email or in-app alerts) — the brief's cure for "forms
  get lost" is one shared system, not alerts; each role checks their page
- **FR-09 extra features** — spec first, per the brief
