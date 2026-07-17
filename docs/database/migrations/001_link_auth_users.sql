-- Migration 001 (revised): Link public.users to auth.users, normalise permissions
--
-- PASTE AND RUN THIS ENTIRE FILE in Supabase SQL Editor.
-- It is safe to re-run — each step uses IF NOT EXISTS / IF EXISTS guards.
--
-- Order matters:
--   Step 1  – remove orphan rows that have no auth.users counterpart (safe delete)
--   Step 2  – add FK to auth.users
--   Step 3  – normalise permission values to Staff | Admin | Developer
--   Step 4  – add check constraint
--   Step 5  – drop the old user_roles column

-- ============================================================
-- DIAGNOSTIC (optional — run this SELECT first if you want to
-- preview which rows will be removed in Step 1):
--
-- SELECT id, email FROM public.users
-- WHERE id NOT IN (SELECT id FROM auth.users);
-- ============================================================

-- ============================================================
-- STEP 1 – Remove orphan rows
-- Any public.users row whose id has no matching auth.users row
-- cannot satisfy the FK. Remove them before adding the constraint.
-- ============================================================
delete from public.users
  where id not in (select id from auth.users);

-- ============================================================
-- STEP 2 – FK to auth.users (safe to add now — no orphans left)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_auth_fkey' and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_auth_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ============================================================
-- STEP 3 – Normalise permissions to Staff / Admin / Developer
-- ============================================================
update public.users set user_permissions = ARRAY['Staff']
  where id in (
    'd0000000-0000-0000-0000-000000000001',  -- Aamna Hussain
    'd0000000-0000-0000-0000-000000000002',  -- Aisha Fayyaz
    'd0000000-0000-0000-0000-000000000004',  -- Sam Smith
    'd0000000-0000-0000-0000-000000000005',  -- Alice Johnson
    'd0000000-0000-0000-0000-000000000007',  -- Carol White
    'd0000000-0000-0000-0000-000000000008',  -- James Taylor
    'd0000000-0000-0000-0000-000000000009'   -- Sarah Connor
  );

update public.users set user_permissions = ARRAY['Admin']
  where id in (
    'd0000000-0000-0000-0000-000000000003',  -- David McWilliams
    'd0000000-0000-0000-0000-000000000010'   -- Michael Brown
  );

update public.users set user_permissions = ARRAY['Developer', 'Admin']
  where id = 'd0000000-0000-0000-0000-000000000006';  -- Bob Smith

-- ============================================================
-- STEP 4 – Check constraint (only Staff, Admin, Developer allowed)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_permissions_valid' and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_permissions_valid
      check (user_permissions <@ ARRAY['Staff', 'Admin', 'Developer']::text[]);
  end if;
end $$;

-- ============================================================
-- STEP 5 – Drop the now-redundant user_roles column
-- ============================================================
alter table public.users drop column if exists user_roles;
