-- Migration: rename broker fee columns in deals
--   broker_fee       → broker_fee_type
--   broker_fee_query → broker_fee_value
--
-- Run this in the Supabase SQL Editor.

ALTER TABLE deals RENAME COLUMN broker_fee TO broker_fee_type;
ALTER TABLE deals RENAME COLUMN broker_fee_query TO broker_fee_value;
