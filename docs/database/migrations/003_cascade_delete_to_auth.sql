-- Migration 003: Cascade delete from public.users → auth.users
--
-- Problem: deleting from public.users does NOT remove the auth.users row
-- because the FK only cascades in the other direction (auth → public).
--
-- Solution: a SECURITY DEFINER trigger function that runs as the postgres
-- superuser, giving it permission to delete from the auth schema.
--
-- Run this in Supabase SQL Editor.

create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = OLD.id;
  return OLD;
end;
$$;

create trigger on_public_user_deleted
  after delete on public.users
  for each row
  execute function public.handle_user_delete();
