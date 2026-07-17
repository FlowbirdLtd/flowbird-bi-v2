-- Migration 005: Pipedrive integration support
-- Run in Supabase SQL Editor.

-- Add Pipedrive integration columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pipedrive_api_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pipedrive_last_synced_at timestamptz;

-- Unique constraints required for upsert (ON CONFLICT) during Pipedrive sync.
-- NULLs are excluded from unique checks so existing non-Pipedrive rows are unaffected.
ALTER TABLE organisations
  ADD CONSTRAINT organisations_org_pipedrive_id_key UNIQUE (org_pipedrive_id);

ALTER TABLE contacts
  ADD CONSTRAINT contacts_contact_pipedrive_id_key UNIQUE (contact_pipedrive_id);

ALTER TABLE deals
  ADD CONSTRAINT deals_deal_pipedrive_id_key UNIQUE (deal_pipedrive_id);

-- Allow authenticated users to update their own row in public.users
-- (used by the account settings page to save API tokens and profile changes)
CREATE POLICY "users can update own row"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
