-- Migration: organisations / contacts identity column change
--   organisations.name              → nullable (was NOT NULL)
--   organisations.org_pipedrive_id  → NOT NULL (was nullable)
--   contacts.name                   → nullable (was NOT NULL)
--   contacts.contact_pipedrive_id   → NOT NULL (was nullable)
--
-- Run this in the Supabase SQL Editor.

-- Rows without a Pipedrive ID cannot satisfy the new NOT NULL constraints.
-- These can only have come from imports where the ID column was not mapped
-- (they are unreachable duplicates), so remove them first.
-- ⚠ Review these rows before running if unsure:
--   select * from organisations where org_pipedrive_id is null;
--   select * from contacts where contact_pipedrive_id is null;
DELETE FROM contacts WHERE contact_pipedrive_id IS NULL;
DELETE FROM organisations WHERE org_pipedrive_id IS NULL;

ALTER TABLE organisations ALTER COLUMN name DROP NOT NULL;
ALTER TABLE organisations ALTER COLUMN org_pipedrive_id SET NOT NULL;

ALTER TABLE contacts ALTER COLUMN name DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN contact_pipedrive_id SET NOT NULL;
