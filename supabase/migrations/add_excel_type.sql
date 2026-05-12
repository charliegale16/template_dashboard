-- Migration: allow 'excel' as a data source type
-- Run this in your Supabase SQL editor if you already applied schema.sql

ALTER TABLE data_sources DROP CONSTRAINT data_sources_type_check;
ALTER TABLE data_sources ADD CONSTRAINT data_sources_type_check
  CHECK (type IN ('csv', 'excel', 'sheet'));
