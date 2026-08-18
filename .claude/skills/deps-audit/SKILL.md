---
name: deps-audit
description: Dependency and supply-chain audit for the Flowforce repo — scans npm packages for vulnerabilities, staleness, lockfile drift, risky install scripts, and unused deps, plus the Deno edge-function remote-import surface. Report-only by default; remediation is gated behind explicit user sign-off and a lint+test+build gate. Use whenever the task involves dependency health — vulnerabilities, upgrades, lockfile drift, suspicious packages, supply-chain questions — and as part of any production-readiness review.
---

You are the dependency & supply-chain auditor for Flowforce (React 19 + Vite, npm with `package-lock.json`, Node 22.x pinned in `engines` and CI; Deno edge functions under `supabase/functions/` that import remote modules — a separate supply-chain surface npm audit never sees).

**REPORT-ONLY BY DEFAULT.** Steps 1–6 and 8 only read and analyse. Step 7 (remediation) runs **only** when the user explicitly asks to fix/upgrade, and every change passes a gate before it stays. Never mutate `package.json`, `package-lock.json`, or `node_modules` in a plain audit.

Run steps in order. Collect findings; present them together in the Step 8 report. Do not abort on a non-zero exit — `npm audit` and `npm outdated` exit non-zero **by design** when they find something; capture the output and continue.

---

## Step 1 — Vulnerability scan

```bash
npm audit --json > /tmp/deps-audit-npm.json 2>/dev/null; echo "exit=$?"
npm audit --omit=dev --json > /tmp/deps-audit-prod.json 2>/dev/null; echo "prod exit=$?"
```

Parse both JSON files (not the human text — it truncates):

- From `/tmp/deps-audit-npm.json`: read `.metadata.vulnerabilities` for the count by severity (`critical`, `high`, `moderate`, `low`, `info`). For each entry under `.vulnerabilities`, record the package name, severity, whether it is a **direct** dependency (`.vulnerabilities[pkg].isDirect === true`) or transitive, and `.via` (what pulls it in / which advisory).
- `/tmp/deps-audit-prod.json` is the **production-only** picture (`--omit=dev`). A vuln that appears here ships to users; one that is only in the full report is dev-tooling exposure (vite, vitest, eslint, playwright). Separate the two explicitly — a moderate in a prod dep outranks a high in a dev-only dep for this codebase.

If `npm audit` reports `0` across all severities, state that plainly and move on.

---

## Step 2 — Staleness scan

```bash
npm outdated --json > /tmp/deps-audit-outdated.json 2>/dev/null; echo "exit=$?"
```

For each package the JSON lists (`current`, `wanted`, `latest`), classify:

- **Patch/minor available** (`wanted` > `current`, same major) — low risk; a `npm update` candidate.
- **Major behind** (`latest` major > `current` major) — needs migration research, **out of scope for auto-fix**. List with the current→latest majors so the user can decide.
- **Deprecated** — check the ones that look abandoned or that you're bumping:

```bash
npm view <pkg> deprecated 2>/dev/null    # non-empty string = deprecated, shows the notice
npm ls <pkg>                             # who depends on it, and at what version
```

Watch the Flowforce-specific majors: `react`/`react-dom` (19.x), `react-router-dom` (7.x), `vite` (8.x), `vitest`/`@vitest/ui` (4.x), `@tanstack/react-query` (5.x), the `@tiptap/*` family (must all move together), `@react-pdf/renderer` (4.x), `tailwindcss`/`@tailwindcss/vite` (4.x — these two must stay in lockstep).

---

## Step 3 — Lockfile & install hygiene

**Lockfile in sync with `package.json`** (drift means CI `npm ci` can install different trees than local):

```bash
cp package-lock.json /tmp/deps-audit-lock.bak
npm install --package-lock-only --ignore-scripts
git diff --stat package-lock.json          # MUST be empty
git checkout package-lock.json 2>/dev/null || cp /tmp/deps-audit-lock.bak package-lock.json
```

A non-empty diff = lockfile is stale; flag it (and note the restore above put it back). As a cross-check, `npm ci --dry-run 2>&1 | tail -5` fails loudly if the lockfile and manifest disagree.

**Engines vs local Node** — `engines.node` is `22.x`:

```bash
node -v                                    # must satisfy 22.x
grep -A2 '"engines"' package.json
```

Flag a mismatch: an audit run on Node 20 or 24 can resolve a different tree than CI's Node 22.

**Duplicate majors of runtime-critical libs** — two copies of these at different majors break at runtime (hooks dispatcher mismatch, duplicate query caches), and npm audit will not tell you:

```bash
npm ls react react-dom @tanstack/react-query @tiptap/react @tiptap/pm 2>&1 | grep -iE 'react|tanstack|tiptap|deduped|invalid'
```

Any line showing a second, non-`deduped` version of `react`, `react-dom`, `@tanstack/react-query`, or a `@tiptap/*` package is a real finding.

---

## Step 4 — Risky-package heuristics

**Packages with install scripts** (postinstall/preinstall/install are the classic supply-chain execution vector):

```bash
npm query ":attr(scripts, [postinstall]), :attr(scripts, [preinstall]), :attr(scripts, [install])" 2>/dev/null \
  | grep '"name"' | sort -u
```

If `npm query` isn't available, fall back to `grep -nE '"(post|pre)?install":' package-lock.json | sort -u`. Install scripts are common and usually legitimate (esbuild, playwright) — **flag with the package name, don't block.** Call out anything unexpected for a package that has no native/binary reason to run one.

**Recently-added dependencies** (typosquat / just-published-malware window):

```bash
git log -p --follow -n 40 -- package.json | grep -E '^\+ +"' | grep -v '"version"' | sort -u
```

For any name you don't recognise, sanity-check it against the real package before trusting it:

```bash
npm view <pkg> maintainers time.created 2>/dev/null   # single maintainer + brand-new = higher risk
```

Confirm the name is not a one-character variant of a known package (e.g. `reakt`, `@tanstck/*`, `taildwind`). Flag only — never auto-remove; the human decides.

---

## Step 5 — Unused dependencies

```bash
npx --yes depcheck --json > /tmp/deps-audit-depcheck.json 2>/dev/null; echo "exit=$?"
```

Read `.dependencies` (unused) and `.missing` (used but undeclared) from the JSON. **depcheck has heavy false positives on this repo** — it doesn't parse Vite/ESLint/Vitest config wiring. Treat these as expected-present and do NOT report them as unused without confirmation:

- `@tailwindcss/vite`, `tailwindcss` — referenced in `vite.config.js` / `@import` in `src/index.css`
- `@vitejs/plugin-react`, `vite`, `vitest`, `@vitest/ui`, `jsdom` — Vite/Vitest config (`vite.config.js`, `src/tests/setup.js`)
- `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` — `eslint.config.js`
- `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event` — test setup/specs
- `@types/react`, `@types/react-dom` — type-only, never imported at runtime
- `@tiptap/pm`, `@tiptap/suggestion` — peer/transitive deps of the TipTap editor, used indirectly
- `playwright` — used by the `playwright-cli` skill / e2e, not `src/`

**Before reporting ANY package as unused, confirm with a grep** across source and config:

```bash
grep -rEl "['\"]<pkg>['\"]|from ['\"]<pkg>" src/ *.js *.config.js supabase/ 2>/dev/null
```

Only report a package as unused if depcheck flags it, it is not on the ignore list above, and the grep returns nothing. `.missing` entries (used but not in `package.json`) are the more actionable half — report those too.

---

## Step 6 — Edge-function (Deno) supply-chain surface

npm audit covers none of this. Edge functions import remote modules directly by URL.

```bash
# All remote MODULE imports (not API-endpoint string literals):
grep -rhoE "from ['\"]https?://[^'\"]+['\"]" supabase/functions/ | sed "s/from ['\"]//;s/['\"]$//" | sort -u
# Insecure http:// imports (should be none):
grep -rn "from ['\"]http://" supabase/functions/
```

For each distinct import URL, flag:

- **Unpinned / loosely-pinned version** — a URL with no `@version`, or pinned only to a **major** (e.g. `esm.sh/@supabase/supabase-js@2` floats across every 2.x release at deploy time, so the deployed bytes aren't reproducible). Recommend pinning to an exact version. At time of writing the only remote import is `https://esm.sh/@supabase/supabase-js@2` (major-only) — verify that's still the case rather than assuming.
- **`http://` imports** — insecure, a MITM code-execution risk. Any hit is a Critical.
- **Untrusted host** — anything not `esm.sh`, `deno.land/std`, or `jsr:` warrants a second look.

Note in the report that this surface is outside npm audit's coverage and has no lockfile equivalent.

---

## Step 7 — Remediation (GATED — only on explicit user request)

Do NOT run this step in a plain audit. Run it only when the user has said to fix/upgrade. Scope: **patch and minor bumps and `npm audit fix` only.** Major upgrades are out of scope — list them as follow-up (Step 8).

The gate (run after EVERY change; this is what CI runs):

```bash
npm run lint && npx vitest run && npm run build
```

Procedure:

1. **`npm audit fix`** (never `--force` without a separate, explicit sign-off — `--force` installs semver-major breaking changes):
   ```bash
   npm audit fix
   npm run lint && npx vitest run && npm run build
   ```
   Gate passes → keep. Gate fails → `git checkout package.json package-lock.json && npm ci`, and reclassify that advisory as **needs-migration**.

2. **Targeted patch/minor bumps, one package at a time** (never batch — a batch failure tells you nothing about which bump broke it):
   ```bash
   npm install <pkg>@<target-minor-or-patch>
   npm run lint && npx vitest run && npm run build
   ```
   Pass → keep and move to the next. Fail → revert that one package (`git checkout package.json package-lock.json && npm ci`) and record it as needs-migration with the failing gate stage.

3. **Never** touch a major version here. Never edit `package-lock.json` by hand.

Record, per package: attempted target, gate result (pass / which stage failed), kept or reverted.

---

## Step 8 — Report

Present findings in this structure. Omit any section with zero findings — don't write "none found" per section. Lead with a one-line risk verdict.

### Vulnerabilities

Severity-ranked table, **production exposure separated from dev-only**:

| Package | Severity | Prod / Dev | Direct? | Via / advisory | Fix available |
|---|---|---|---|---|---|

### Outdated — majors behind

| Package | Current | Latest | Notes / changelog link |
|---|---|---|---|

(Patch/minor-only lag can be a single summary line unless the user wants the full list.)

### Deprecated packages

> **[DEPRECATED]** `<pkg>@<ver>` — "<notice from npm view>". Pulled in by `<npm ls parent>`.

### Lockfile & install hygiene

> **[LOCKFILE DRIFT]** `package-lock.json` regenerates with changes — out of sync with `package.json`.
> **[DUPLICATE MAJOR]** two copies of `<pkg>` (`x` and `y`) — runtime breakage risk.
> **[ENGINE MISMATCH]** local Node `<v>` does not satisfy `engines.node` (22.x).

### Risky packages

> **[INSTALL SCRIPT]** `<pkg>` runs a `postinstall` — <expected/unexpected>.
> **[RECENTLY ADDED]** `<pkg>` added in `<commit>` — single maintainer / new; verify not a typosquat.

### Unused / missing dependencies (confirmed)

> **[UNUSED]** `<pkg>` — depcheck-flagged, not on the ignore list, no grep hits in `src/` or config. Candidate for removal.
> **[MISSING]** `<pkg>` — imported in `<file>` but absent from `package.json`.

### Deno edge-function imports

> **[UNPINNED IMPORT]** `https://esm.sh/@supabase/supabase-js@2` — major-only pin, not reproducible. Pin to an exact version.
> **[INSECURE IMPORT]** any `http://` import — Critical.

### Recommended actions (ordered by risk)

Numbered list, highest-risk first: prod-shipping criticals/highs → lockfile/duplicate/engine breakage → deprecated/unpinned Deno imports → dev-only vulns → stale majors (as researched follow-ups with changelog links) → cleanup (unused deps).

### Auto-fixed (only if Step 7 ran)

Per change: package, target version, gate result (pass / failing stage), kept or reverted. State the final gate outcome and that anything reverted is now listed under needs-migration.
