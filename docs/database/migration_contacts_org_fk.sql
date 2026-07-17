-- Migration: contacts.organisation_id → references organisations(org_pipedrive_id)
-- Previously: uuid references organisations(id)
-- After: text references organisations(org_pipedrive_id)
--
-- Run this in the Supabase SQL Editor.
-- After running, re-sync Contacts from the app to repopulate organisation_id values.

-- 1. Drop existing FK constraint and index
ALTER TABLE contacts DROP CONSTRAINT contacts_organisation_id_fkey;
DROP INDEX IF EXISTS idx_contacts_organisation_id;

-- 2. Change column type from uuid → text
--    Existing UUID values cannot map to org_pipedrive_id, so set to NULL.
--    Re-syncing contacts will repopulate this column correctly.
ALTER TABLE contacts ALTER COLUMN organisation_id TYPE text USING NULL;

-- 3. Add new FK constraint referencing org_pipedrive_id
ALTER TABLE contacts ADD CONSTRAINT contacts_organisation_id_fkey
  FOREIGN KEY (organisation_id) REFERENCES organisations(org_pipedrive_id) ON DELETE SET NULL;

-- 4. Recreate index
CREATE INDEX idx_contacts_organisation_id ON contacts(organisation_id);
