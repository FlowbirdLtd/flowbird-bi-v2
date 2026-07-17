-- Migration: allow authenticated users to write to organisations, contacts, deals
-- Needed by the Import feature in Account Settings, which upserts from the browser.
-- Upsert requires BOTH insert (new rows) and update (conflicting rows) policies.
--
-- Run this in the Supabase SQL Editor.

-- Organisations
create policy "authenticated can insert organisations"
  on organisations for insert to authenticated with check (true);
create policy "authenticated can update organisations"
  on organisations for update to authenticated using (true) with check (true);

-- Contacts
create policy "authenticated can insert contacts"
  on contacts for insert to authenticated with check (true);
create policy "authenticated can update contacts"
  on contacts for update to authenticated using (true) with check (true);

-- Deals
create policy "authenticated can insert deals"
  on deals for insert to authenticated with check (true);
create policy "authenticated can update deals"
  on deals for update to authenticated using (true) with check (true);
