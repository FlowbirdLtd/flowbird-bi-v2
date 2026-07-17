-- Migration: deals.contact_id / organisation_id → Pipedrive ID references
-- Previously: uuid references contacts(id) / organisations(id)
-- After: text references contacts(contact_pipedrive_id) / organisations(org_pipedrive_id)
--
-- Run this in the Supabase SQL Editor.
-- After running, re-sync Deals from the app to repopulate the FK columns.

-- 1. Drop existing FK constraints and indexes
ALTER TABLE deals DROP CONSTRAINT deals_contact_id_fkey;
ALTER TABLE deals DROP CONSTRAINT deals_organisation_id_fkey;
DROP INDEX IF EXISTS idx_deals_contact_id;
DROP INDEX IF EXISTS idx_deals_organisation_id;

-- 2. Change column types from uuid → text
--    Existing UUID values cannot map to Pipedrive IDs, so set to NULL.
--    Re-syncing deals will repopulate these columns correctly.
ALTER TABLE deals ALTER COLUMN contact_id TYPE text USING NULL;
ALTER TABLE deals ALTER COLUMN organisation_id TYPE text USING NULL;

-- 3. Add new FK constraints referencing Pipedrive ID columns
ALTER TABLE deals ADD CONSTRAINT deals_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(contact_pipedrive_id) ON DELETE SET NULL;
ALTER TABLE deals ADD CONSTRAINT deals_organisation_id_fkey
  FOREIGN KEY (organisation_id) REFERENCES organisations(org_pipedrive_id) ON DELETE SET NULL;

-- 4. Recreate indexes
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_organisation_id ON deals(organisation_id);
