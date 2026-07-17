-- Migration: import history table
-- Records each file import made from Account Settings → Import.
-- The app keeps only the 10 most recent entries (older rows are pruned
-- automatically after each import).
--
-- Run this in the Supabase SQL Editor.

create table import_history (
  id           uuid primary key default gen_random_uuid(),
  file_name    text,
  object_type  text,
  row_count    integer,
  imported_by  text,
  created_at   timestamptz default now()
);

alter table import_history enable row level security;

create policy "authenticated can read import_history"
  on import_history for select to authenticated using (true);
create policy "authenticated can insert import_history"
  on import_history for insert to authenticated with check (true);
create policy "authenticated can delete import_history"
  on import_history for delete to authenticated using (true);
