# TODO — Microsoft (Entra ID) SSO

**Status:** paused mid-setup. Azure app registration not yet created.
**Last worked:** 2026-08-17

Parked to build something else. This file holds everything needed to pick it
back up cold.

---

## Decision made

Use the **Azure/Entra OAuth provider** (`signInWithOAuth({ provider: 'azure' })`),
not SAML SSO.

| | Azure/Entra OAuth | SAML 2.0 SSO (`signInWithSSO`) |
|---|---|---|
| Plan | any, incl. Free | Pro+ **and** the SSO add-on |
| Config | Dashboard + `config.toml` | CLI/Management API only, per-domain |
| Works locally | yes | awkward |

Azure OAuth *is* Entra ID over OIDC — tenant restriction, conditional access
and MFA all still apply. SAML is only worth it if a non-Entra IdP has to be
federated behind it.

---

## Blocked on

Four values, then the Supabase + app work can proceed:

1. Application (client) ID
2. Directory (tenant) ID
3. Client secret **Value**
4. Hosted Supabase project ref

And one open question: the tenant is **pfgl.co.uk**, but the earlier plan
assumed `@flowbird.co.uk` for the domain allowlist — **which domain(s) may sign
in?**

Also undecided:

- Does email/password login stay, or is Microsoft the only way in? (SSO-only
  would let us retire `/set-password` and simplify `manage-user`.)
- New starters: still invited from the Users page (row pre-created, they just
  click Microsoft), or auto-provisioned on first sign-in by domain?

---

## Why this isn't just a button — the profile-row gap

This is the thing that will actually break, and it drives the whole plan.

- `public.users.id` is a FK to `auth.users(id)`
  (`supabase/migrations/20260101000000_schema.sql:316`).
- The app resolves your profile **by uid** — `src/pages/UsersPage.jsx:92` does
  `allUsers.find(u => u.id === authUser?.id)`.
- RLS policy `users can update own row` is `auth.uid() = id`.
- Those rows are created **only** by the invite path (`manage-user` →
  `inviteUserByEmail` + insert).

Two cases on first Microsoft sign-in:

1. **Already-invited user, same email** → Supabase auto-links the azure identity
   onto the existing auth user; uid unchanged, profile survives. ✅
   *But* auto-linking requires the provider email be **verified**, and Entra
   doesn't assert that by default — hence the **`xms_edov`** optional claim
   (step 6 below). Without it you get a second, orphaned auth user.
2. **Any other Microsoft account** → new `auth.users` row, **no `public.users`
   row**. They're logged in, `user_permissions` is empty, Users page and Account
   Settings break. Silent half-broken state.

Fix for case 2, cheapest first:

- **Set `enable_signup = false`** in `config.toml` / dashboard. Sign-in for
  existing users *and* identity linking still work; a stranger's Microsoft
  account is rejected outright. Fits the invite-only model exactly.
- If auto-provisioning by domain is wanted instead, use a
  **`before-user-created` auth hook** (Postgres function or edge function)
  rejecting anything outside the allowlist.
- Either way: add a guard so "authenticated but no profile row" shows an
  *access not provisioned* screen and signs out, rather than rendering a broken
  dashboard.

> ⚠️ Related gotcha: `docs/database/schema.sql:373` has a `create_user` RPC that
> inserts straight into `auth.users`. Any row created that way must have
> `email_confirmed_at` set, or Supabase refuses to link the Microsoft identity.

---

## Part A — Azure portal (portal.azure.com) — NOT STARTED

Signed in as **Hanne Jessen · PFGL (PFGL.CO.UK)** — confirm that's the intended
directory before registering.

Needs the **Application Administrator** or **Cloud Application Administrator**
role. If "App registrations" is missing or *New registration* is greyed out, a
tenant admin has to do this part.

- [ ] **1. Find the blade.** Search `Microsoft Entra ID` in the top search bar →
      left menu **Manage → App registrations** → **+ New registration**.
      (It is not on the Azure home page under any visible tile.)

- [ ] **2. Register the app.**
      - Name: `Flowbird BI` (internal label, users never see it)
      - Supported account types: **Accounts in this organizational directory
        only (PFGL only — Single tenant)**
      - Redirect URI: platform **Web** (not SPA — Supabase does the token
        exchange server-side), URI:
        `https://<project-ref>.supabase.co/auth/v1/callback`
        (project ref from the Supabase dashboard URL, or Project Settings →
        Data API)

- [ ] **3. Copy from Overview:** Application (client) ID, Directory (tenant) ID.

- [ ] **4. Add local dev redirect.** **Manage → Authentication** → Web →
      Redirect URIs → Add URI:
      `http://localhost:55321/auth/v1/callback`
      (55321 is the local Supabase API port. Azure rejects `127.0.0.1`, so it
      must be `localhost`.) Save.

- [ ] **5. Client secret.** **Manage → Certificates & secrets** → Client secrets
      → **+ New client secret**. Description `Supabase auth`, expiry 24 months
      (**diary the expiry — sign-in breaks when it lapses**).
      Copy the **`Value`** column immediately, not `Secret ID` — it's masked
      once you navigate away and cannot be recovered.

- [ ] **6. Email-verified claim.** **Manage → Token configuration** → **+ Add
      optional claim** → token type **ID** → tick **`xms_edov`** → Add. Accept
      the prompt to turn on the required Microsoft Graph permissions.
      This is the one that matters for existing users (see case 1 above).

---

## Part B — Supabase config — NOT STARTED

- [ ] **Hosted:** Auth → Sign In / Providers → **Azure**: client ID, secret,
      and Azure Tenant URL `https://login.microsoftonline.com/<tenant-id>/v2.0`.
      Add `<app-url>/auth/callback` to Redirect URLs.

- [ ] **Local `supabase/config.toml`:**
      ```toml
      [auth.external.azure]
      enabled = true
      client_id = "env(SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID)"
      secret = "env(SUPABASE_AUTH_EXTERNAL_AZURE_SECRET)"
      url = "https://login.microsoftonline.com/<tenant-id>/v2.0"
      ```
      Secret via env substitution — **never committed**.

- [ ] Add `http://localhost:5174/auth/callback` to `additional_redirect_urls`
      (`supabase/config.toml:173`).

- [ ] Decide + apply the `enable_signup = false` gate (or the
      `before-user-created` hook). Written as a migration, **left unapplied**
      until sign-off, per repo policy.

---

## Part C — App code — NOT STARTED

Four small files:

- [ ] `src/lib/platformClient.js` — add `{ auth: { flowType: 'pkce' } }`.
- [ ] `src/contexts/AuthContext.jsx` — add `signInWithMicrosoft()`:
      ```js
      platform.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'openid profile email offline_access',
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      ```
- [ ] `src/router/AppRouter.jsx` — new **public** `/auth/callback` route.
      Required: `ProtectedRoute` would otherwise bounce to `/login` mid-parse
      and swallow the `error_description` param.
- [ ] `src/pages/LoginPage.jsx` — "Sign in with Microsoft" button above the
      email/password form. Inline styles + CSS vars + inline SVG logo, per
      conventions (no icon library).

---

## Part D — Docs — NOT STARTED

- [ ] `docs/database/SETUP.md` §4 currently says email/password only — needs the
      Azure provider steps for a remote rebuild.

---

## Verification (once built)

- `supabase start`, sign in as an **existing invited user** via Microsoft →
  check `auth.identities` has both an `email` and an `azure` row sharing one
  `user_id`, and the profile/permissions still resolve.
- Sign in with a **random Microsoft account** → rejected, no orphan
  `auth.users` row created.
- Run `/smoke` before shipping.

---

## Build route

Once unblocked, run this through the **`build-feature`** skill — app/UI layer
first, DB/config gate written-but-unapplied until explicit go.
