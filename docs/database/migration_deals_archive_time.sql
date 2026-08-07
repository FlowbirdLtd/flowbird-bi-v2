-- Migration: add archive_time to deals
-- Stores Pipedrive's archive timestamp — null = active deal, set = archived.
-- The Deals page shows archived deals only under the "Archived" tab.
--
-- Run this in the Supabase SQL Editor, then redeploy sync-pipedrive and
-- re-run Sync Deals to populate the column.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS archive_time timestamptz;
