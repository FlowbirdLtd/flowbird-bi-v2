-- Migration 002: Allow authenticated users to delete from public.users
-- Run this in Supabase SQL Editor

create policy "authenticated can delete users"
  on users for delete to authenticated using (true);
