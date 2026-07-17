-- Migration 004: RPC function to create a user in auth.users + public.users atomically
--
-- Why an RPC function?
--   Creating auth users requires superuser access (auth schema).
--   SECURITY DEFINER lets this run as the postgres owner, not the calling role.
--   The frontend calls platform.rpc('create_user_with_auth', { ... }) — no
--   service-role key is ever exposed to the browser.
--
-- Run this in Supabase SQL Editor.

-- Enable pgcrypto for crypt() and gen_salt() (safe to run if already enabled)
create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_user_with_auth(
  p_name        text,
  p_email       text,
  p_permissions text[] default ARRAY['Staff']::text[]
)
returns uuid
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  -- 1. Create the auth.users row (default password: Flowbird2024!)
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
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    extensions.crypt('Flowbird2024!', extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name),
    false,
    'authenticated',
    'authenticated',
    '',
    ''
  );

  -- 2. Create the auth.identities row (required for email/password login)
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    p_email,
    now(),
    now(),
    now()
  );

  -- 3. Create the public.users profile row
  insert into public.users (
    id, name, email, user_permissions, user_status, date_created, created_at, updated_at
  ) values (
    v_user_id, p_name, p_email, p_permissions, 'active', now()::date, now(), now()
  );

  return v_user_id;
end;
$$;

-- Grant execute to authenticated users (logged-in webapp users)
grant execute on function public.create_user_with_auth(text, text, text[]) to authenticated;
