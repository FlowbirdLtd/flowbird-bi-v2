-- Flowbird BI v2 – Row Level Security Policies
-- Run this AFTER schema.sql
-- Grants SELECT to both anon (pre-login checks) and authenticated (logged-in users).
-- Grants INSERT/UPDATE to authenticated on organisations, contacts, deals
-- (required by the Import feature, which upserts from the browser).

-- Organisations
create policy "anon can read organisations"
  on organisations for select to anon using (true);
create policy "authenticated can read organisations"
  on organisations for select to authenticated using (true);
create policy "authenticated can insert organisations"
  on organisations for insert to authenticated with check (true);
create policy "authenticated can update organisations"
  on organisations for update to authenticated using (true) with check (true);

-- Contacts
create policy "anon can read contacts"
  on contacts for select to anon using (true);
create policy "authenticated can read contacts"
  on contacts for select to authenticated using (true);
create policy "authenticated can insert contacts"
  on contacts for insert to authenticated with check (true);
create policy "authenticated can update contacts"
  on contacts for update to authenticated using (true) with check (true);

-- Deals
create policy "anon can read deals"
  on deals for select to anon using (true);
create policy "authenticated can read deals"
  on deals for select to authenticated using (true);
create policy "authenticated can insert deals"
  on deals for insert to authenticated with check (true);
create policy "authenticated can update deals"
  on deals for update to authenticated using (true) with check (true);

-- Import history
create policy "authenticated can read import_history"
  on import_history for select to authenticated using (true);
create policy "authenticated can insert import_history"
  on import_history for insert to authenticated with check (true);
create policy "authenticated can delete import_history"
  on import_history for delete to authenticated using (true);

-- Users
create policy "anon can read users"
  on users for select to anon using (true);
create policy "authenticated can read users"
  on users for select to authenticated using (true);
create policy "authenticated can delete users"
  on users for delete to authenticated using (true);
create policy "users can update own row"
  on users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
