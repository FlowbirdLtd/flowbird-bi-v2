-- Flowbird BI v2 – Local development admin login
--
--   admin@flowbird.test / flowbird-local
--   Permissions: Staff + Admin + Developer (everything the app gates on)
--
-- LOCAL ONLY. This is a known, committed credential — never run this against a
-- hosted project. It exists so local work doesn't need a real colleague's
-- account from seed.sql.
--
-- Runs automatically on `supabase db reset` (wired in config.toml [db.seed]).
-- Idempotent: fixed UUID + `on conflict do nothing`, safe to re-run.

-- pgcrypto lives in the `extensions` schema (see schema.sql); crypt() and
-- gen_salt() below are unqualified, so it must be on the search_path.
set search_path = extensions, public;

-- ── Auth account ──────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  -- GoTrue scans these into non-nullable strings; NULL here makes login fail
  -- with 500 "Database error querying schema".
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values (
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@flowbird.test',
  crypt('flowbird-local', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Local Admin"}',
  false, 'authenticated', 'authenticated',
  '', '', '', '', '', '', '', ''
) on conflict do nothing;

-- ── Identity (required for email/password sign-in) ────────────────────────────
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'e0000000-0000-0000-0000-000000000001',
  '{"sub":"e0000000-0000-0000-0000-000000000001","email":"admin@flowbird.test"}',
  'email', 'admin@flowbird.test',
  now(), now(), now()
) on conflict do nothing;

-- ── App profile ───────────────────────────────────────────────────────────────
-- All three permissions: Developer unlocks Integrations (APIs + Sync), Admin
-- unlocks Import and user management, Staff is the baseline.
insert into public.users (
  id, name, email, user_status, user_permissions, date_created,
  created_at, updated_at
) values (
  'e0000000-0000-0000-0000-000000000001',
  'Local Admin',
  'admin@flowbird.test',
  'active',
  ARRAY['Staff', 'Admin', 'Developer'],
  now()::date, now(), now()
) on conflict do nothing;
