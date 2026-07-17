-- Migration: deals identity column change
--   title             → nullable (was NOT NULL)
--   deal_pipedrive_id → NOT NULL (was nullable)
--
-- Run this in the Supabase SQL Editor.

-- Rows without a Pipedrive ID cannot satisfy the new NOT NULL constraint.
-- These can only have come from imports where deal_pipedrive_id was not
-- mapped (they are unreachable duplicates), so remove them first.
-- ⚠ Review these rows before running if unsure:
--   select * from deals where deal_pipedrive_id is null;
DELETE FROM deals WHERE deal_pipedrive_id IS NULL;

ALTER TABLE deals ALTER COLUMN title DROP NOT NULL;
ALTER TABLE deals ALTER COLUMN deal_pipedrive_id SET NOT NULL;
