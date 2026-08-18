-- Flowbird BI v2 – Supabase Auth Users
-- Creates Auth accounts for all 10 users in the public.users table
-- Uses matching UUIDs (d0...00N) so auth.users.id = public.users.id
-- Default password for all: Flowbird2024!
--
-- HOW TO RUN:
--   Hosted: Supabase dashboard → SQL Editor → New query → paste → Run
--   Local:  runs automatically as the first seed file on `supabase db reset`
--           (wired up in supabase/config.toml under [db.seed])
--
-- After running, all 10 users will appear in Authentication → Users
-- and can log in at /login with their @pfgl.co.uk email + Flowbird2024!

-- pgcrypto lives in the `extensions` schema (see schema.sql). The hosted SQL
-- Editor already has it on the search_path; psql / db reset does not, so the
-- bare crypt() and gen_salt() calls below would fail without this.
set search_path = extensions, public;

-- ============================================================
-- STEP 1 – Auth users
-- ============================================================
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token
) values
  (
    'd0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'aamna.hussain@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Aamna Hussain"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'aisha.fayyaz@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Aisha Fayyaz"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'david.mcwilliams@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"David McWilliams"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'sam.smith@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Sam Smith"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'alice.johnson@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Alice Johnson"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'bob.smith@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Bob Smith"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'carol.white@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Carol White"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'james.taylor@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"James Taylor"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'sarah.connor@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Sarah Connor"}',
    false, 'authenticated', 'authenticated', '', ''
  ),
  (
    'd0000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000000',
    'michael.brown@pfgl.co.uk',
    crypt('Flowbird2024!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Michael Brown"}',
    false, 'authenticated', 'authenticated', '', ''
  );

-- ============================================================
-- STEP 2 – Identities (required for email/password login)
-- ============================================================
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', '{"sub":"d0000000-0000-0000-0000-000000000001","email":"aamna.hussain@pfgl.co.uk"}',    'email', 'aamna.hussain@pfgl.co.uk',    now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', '{"sub":"d0000000-0000-0000-0000-000000000002","email":"aisha.fayyaz@pfgl.co.uk"}',     'email', 'aisha.fayyaz@pfgl.co.uk',     now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000003', '{"sub":"d0000000-0000-0000-0000-000000000003","email":"david.mcwilliams@pfgl.co.uk"}', 'email', 'david.mcwilliams@pfgl.co.uk', now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000004', '{"sub":"d0000000-0000-0000-0000-000000000004","email":"sam.smith@pfgl.co.uk"}',        'email', 'sam.smith@pfgl.co.uk',        now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000005', '{"sub":"d0000000-0000-0000-0000-000000000005","email":"alice.johnson@pfgl.co.uk"}',    'email', 'alice.johnson@pfgl.co.uk',    now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000006', '{"sub":"d0000000-0000-0000-0000-000000000006","email":"bob.smith@pfgl.co.uk"}',        'email', 'bob.smith@pfgl.co.uk',        now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000007', '{"sub":"d0000000-0000-0000-0000-000000000007","email":"carol.white@pfgl.co.uk"}',      'email', 'carol.white@pfgl.co.uk',      now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000008', '{"sub":"d0000000-0000-0000-0000-000000000008","email":"james.taylor@pfgl.co.uk"}',     'email', 'james.taylor@pfgl.co.uk',     now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000009', '{"sub":"d0000000-0000-0000-0000-000000000009","email":"sarah.connor@pfgl.co.uk"}',     'email', 'sarah.connor@pfgl.co.uk',     now(), now(), now()),
  (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000010', '{"sub":"d0000000-0000-0000-0000-000000000010","email":"michael.brown@pfgl.co.uk"}',    'email', 'michael.brown@pfgl.co.uk',    now(), now(), now());

-- ============================================================
-- STEP 3 – Normalise nullable GoTrue token columns
-- ============================================================
-- GoTrue scans these columns into non-nullable Go strings. Rows inserted
-- directly into auth.users leave them NULL, which makes every login fail with
-- 500 "Database error querying schema". Harmless on a hosted project, required
-- locally — keep this last.
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where email like '%@pfgl.co.uk';
