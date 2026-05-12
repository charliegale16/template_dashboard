-- Reports table
-- Stores saved report configurations linked to a data source.
-- config JSONB holds the full report layout, theme, sections, filters, etc.

CREATE TABLE IF NOT EXISTS reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id  UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Untitled Report',
  config     JSONB NOT NULL DEFAULT '{}',
  shared     BOOLEAN NOT NULL DEFAULT false,
  version    INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Owner manages reports"
  ON reports FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read shared reports (for public link sharing)
CREATE POLICY "Public read of shared reports"
  ON reports FOR SELECT
  USING (shared = true);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_reports_updated_at();
