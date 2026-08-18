---
name: smoke
description: Smoke-test the Flowforce app end-to-end — prove it builds, boots, and its critical surfaces render without blank screens, import errors, or console crashes. Catches what unit tests can't (broken builds, blank routes, ErrorBoundary hits, chunk-load failures). Use before any release and whenever there's doubt the app still builds and boots — after risky structural changes, dependency bumps, or router/layout edits, run it proactively.
---

# Smoke

A layered smoke pass: cheapest signal first (does it build?), then boot the built
app and drive it in a real browser. Each tier gates the next — a failed build
means there's nothing to boot, so stop there and report.

**This is a diagnostic, not a fix.** Never edit source to make a tier pass — report
the failure. In the authenticated tier you may drive a **real production database**,
so the read-only safety rule in Step 4 is absolute.

Work the steps in order. Collect findings and present the report format at the end.

---

## Step 0 — Preconditions

```bash
cd /Users/sanskar/Desktop/flow_force/flow_force
test -f .env.local && grep -q '^VITE_SUPABASE_URL=' .env.local && grep -q '^VITE_SUPABASE_ANON_KEY=' .env.local && echo "ENV OK" || echo "ENV MISSING"
```

If this prints `ENV MISSING`, **stop** and report: the built app cannot boot without
real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (the Supabase client throws at
module load). Do **not** fabricate env values — report and end with **SMOKE FAIL
(no env)**.

---

## Step 1 — Static gate (build)

The cheapest smoke signal. A broken import or syntax error fails here in seconds.

```bash
npm run build 2>&1 | tee /tmp/smoke-build.log
```

- **Non-zero exit** → the build is broken. Capture the first error (module not found,
  transform error, etc.), report it, and stop with **SMOKE FAIL (build)**. No point
  booting.
- **Success** → scan the log for bundle warnings worth flagging:

```bash
grep -iE "warning|larger than|chunks are larger|dynamic import will not move|\(!\)" /tmp/smoke-build.log
```

Note any chunk over ~1000 kB or Rollup `(!)` warnings in the report (non-blocking).

---

## Step 2 — Boot the built app

Serve the production build and wait for the port to actually answer before driving it.

```bash
# Start preview server detached; log to a file so we can read the bound port.
npm run preview > /tmp/smoke-preview.log 2>&1 &
echo $! > /tmp/smoke-preview.pid

# Wait up to 30s for the port to respond. Vite preview defaults to 4173.
BASE=http://localhost:4173
for i in $(seq 1 30); do
  if curl -sf -o /dev/null "$BASE"; then echo "UP: $BASE"; break; fi
  sleep 1
done
curl -sf -o /dev/null "$BASE" || { echo "PREVIEW DID NOT START"; cat /tmp/smoke-preview.log; }
```

If the loop times out, print `/tmp/smoke-preview.log` (the port may differ — Vite
picks the next free port and prints `Local: http://localhost:XXXX/`; re-read the log
and retry the curl against the printed port). If it still won't answer, run Step 6
teardown and stop with **SMOKE FAIL (boot)**.

Use the confirmed URL as `$BASE` for all Playwright steps below.

---

## Step 3 — Unauthenticated smoke (Playwright)

Invoke the **`playwright-cli` skill** (via the Skill tool) to drive the browser — do
not hand-roll Playwright. Ask it to run this sequence and hand back the results:

1. **Root renders the login page.** Navigate to `$BASE/`. With no session, `AuthGate`
   renders `LoginPage`. Assert the page is not blank and contains the heading
   `Flowforce` and the text `Continue with Google`. A blank `<div id="root">` here is
   a hard failure (the app never mounted).
2. **Capture everything.** For the whole session, collect:
   - all `console` messages of type `error`,
   - all failed network requests (`response.status() >= 400` and request failures),
   - any uncaught page exceptions (`pageerror`).
3. **Screenshot** to `/tmp/smoke-login.png`.
4. **Public, session-less routes render intentional content — not a crash:**
   - `$BASE/portal` → `AuthGate` renders `PortalPage` (magic-link portal). Assert
     non-blank; expect a portal/login prompt, not an ErrorBoundary.
   - `$BASE/approve/00000000-0000-0000-0000-000000000000` → renders `ApprovalPage`.
     A bogus id should show a "not found / invalid" state, **not** a white screen or
     an uncaught exception. Screenshot to `/tmp/smoke-approve.png`.
   - `$BASE/tv` → renders `TVDashboardPage`. Assert non-blank.

Record per-route: rendered? (non-empty body), console errors, failed requests.

---

## Step 4 — Authenticated smoke (optional tier)

**Gate:** only run this tier if both creds exist:

```bash
grep -q '^SMOKE_EMAIL=' .env.local && grep -q '^SMOKE_PASSWORD=' .env.local && echo "AUTH TIER ON" || echo "AUTH TIER SKIPPED"
```

If `AUTH TIER SKIPPED`, note it in the report and go to Step 5 — the unauthenticated
tier alone is still a valid (partial) smoke pass.

> ### READ-ONLY SAFETY RULE — non-negotiable
> This tier may run against the **live production Supabase database**. The browser
> session is a real logged-in user.
> - **Only navigate and read.** Visit routes, assert content, screenshot.
> - **Never** submit a form, click Save / Create / Delete / Send / Archive / Approve,
>   toggle a setting, start/stop a timer, or drag a board card.
> - The only form you may submit is the **login form itself** (Step 4a).
> - If a route requires interaction to render anything, record it as "needs
>   interaction — skipped" rather than clicking through.
> Instruct the `playwright-cli` skill of this rule explicitly in your request to it.

### 4a — Log in (password mode)

Read the creds (do not echo them into the report):

```bash
SMOKE_EMAIL=$(grep '^SMOKE_EMAIL=' .env.local | cut -d= -f2-)
```

Have the `playwright-cli` skill:
1. Navigate to `$BASE/`.
2. The login form defaults to **magic-link** mode — click the button
   **"Sign in with password instead"** to reveal the password field.
3. Fill `#email` with `SMOKE_EMAIL` and `#password` with `SMOKE_PASSWORD`.
4. Click the **"Sign in"** submit button.
5. Wait for navigation away from the login form (the index route redirects to
   `/communications`). Assert the app shell (Sidebar/TopBar) is present. If login
   fails (error text appears, still on login form after ~10s), report **SMOKE FAIL
   (auth login)** and skip the route sweep.

### 4b — Critical route sweep (read-only)

Visit each route below (derived from `src/router/AppRouter.jsx`). For **each**:
assert the page body is non-empty, assert the ErrorBoundary fallback text
**"Something went wrong"** is **absent**, and capture console errors / failed
requests. Screenshot the first failure of each kind.

Core surfaces (every user should see these):

| Route | Page |
|---|---|
| `/communications` | CommunicationsPage (the default landing route) |
| `/dashboard` | DashboardPage |
| `/crm` | CRMPage |
| `/crm/leads` | LeadsPage |
| `/crm/deals` | DealsPage |
| `/engagements` | ProjectsPage |
| `/work` | WorkPage |
| `/time` | TimePage |
| `/support` | SupportTicketsPage |
| `/change-control` | ChangeControlPage |
| `/docs` | DocumentsPage |
| `/meetings` | MeetingsPage |
| `/intranet` | IntranetPage |
| `/reports` | ReportsPage (redirects to `/reports/overdue`) |
| `/find-work` | FindWorkPage |
| `/huddle` | HuddlePage |
| `/holidays` | HolidaysPage |
| `/templates` | TemplatesPage |
| `/archive` | ArchivePage |
| `/settings` | SettingsPage |

Capability-gated routes (the `RequireAccess` guard redirects to `/` if the smoke
account lacks the flag — **a redirect to `/` is a PASS-WITH-NOTE, not a failure**;
only an ErrorBoundary or blank screen fails):

| Route | Required flag |
|---|---|
| `/billing` | `access_billing` |
| `/activity` | `is_admin` |
| `/eos` | `is_admin` |
| `/hr` | `manages_hr` |

Do **not** visit detail routes that need a real record id (`/crm/:clientId`,
`/engagements/:projectId`, `/billing/invoices/:id`, etc.) unless you first read a
valid id via a read-only query — a fabricated id tests a 404 path, not a real render.
Skipping them is fine for a smoke pass.

---

## Step 5 — Console-error triage

Not every console error is a failure. Classify each captured error before verdict:

**Hard failures (these fail the smoke):**
- Uncaught exceptions / `pageerror` events.
- `Failed to load ... chunk` / dynamic import / `ChunkLoadError` (stale or broken build).
- React ErrorBoundary hit — page shows **"Something went wrong"**.
- A core route rendered a blank body (`#root` empty or only whitespace).
- 5xx responses from the app's own Supabase/API calls.

**Noise (do not fail on these — but list them):**
- `401` / `403` on the unauthenticated tier (expected — no session yet).
- Failed requests to the separate error-logging project (`VITE_FB_ERROR_*`) or
  `report-client-error` — best-effort, no-ops when unconfigured.
- Third-party / browser-extension warnings, favicon 404, React DevTools notices,
  benign deprecation warnings.

When unsure, quote the exact error in the report and mark it **needs-judgment**
rather than silently dropping it.

---

## Step 6 — Teardown

Always run this, even if an earlier step failed.

```bash
kill "$(cat /tmp/smoke-preview.pid)" 2>/dev/null || true
# Belt-and-braces: kill any lingering vite preview on the port.
pkill -f "vite preview" 2>/dev/null || true
rm -f /tmp/smoke-preview.pid
echo "preview stopped"
```

Also close the Playwright browser via the `playwright-cli` skill.

---

## Report

Present findings in this structure. Omit empty sections.

### Verdict
**SMOKE PASS** or **SMOKE FAIL** — one line. If FAIL, list the blocking reasons.

### Tiers run
- Build: pass / fail
- Boot: pass / fail (bound URL)
- Unauthenticated: pass / fail
- Authenticated: pass / fail / **skipped (no SMOKE_EMAIL/SMOKE_PASSWORD)**

### Build
- Result + any bundle warnings worth flagging (large chunks, Rollup `(!)`).

### Route matrix
One row per route visited:

| Route | Rendered | Console errors | Failed requests | Notes |
|---|---|---|---|---|
| /communications | ✅ | 0 | 0 | |
| /billing | ↩︎ redirect→/ | 0 | 0 | guarded, account lacks access_billing (expected) |
| /reports | ❌ | 1 | 0 | ErrorBoundary: "Something went wrong" |

Legend: ✅ rendered · ❌ hard failure · ↩︎ guard redirect (pass-with-note).

### Console-error summary
- **Hard failures:** quote each, with the route and a screenshot path.
- **Noise (informational):** brief list.
- **Needs-judgment:** anything you couldn't confidently classify.

### Screenshots
- `/tmp/smoke-login.png`, `/tmp/smoke-approve.png`, plus any per-failure captures.

### Blocking reasons (only if SMOKE FAIL)
- e.g. `build failed: Could not resolve '../pages/FooPage' in AppRouter.jsx`
- e.g. `/work rendered ErrorBoundary — TypeError: cannot read 'name' of undefined`
