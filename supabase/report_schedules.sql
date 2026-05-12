-- Run this in your Supabase SQL editor to add report scheduling support

CREATE TABLE IF NOT EXISTS report_schedules (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES auth.users NOT NULL,
  source_id      uuid        REFERENCES data_sources(id) ON DELETE CASCADE NOT NULL,
  name           text        NOT NULL DEFAULT 'Report',
  recipient      text        NOT NULL,
  frequency      text        NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week    int         CHECK (day_of_week BETWEEN 0 AND 6),   -- 0=Sun, used when frequency='weekly'
  day_of_month   int         CHECK (day_of_month BETWEEN 1 AND 31), -- used when frequency='monthly'
  hour_utc       int         NOT NULL DEFAULT 9 CHECK (hour_utc BETWEEN 0 AND 23),
  date_filter    jsonb       NOT NULL DEFAULT '{"type":"all","value":null}'::jsonb,
  active         boolean     NOT NULL DEFAULT true,
  last_sent_at   timestamptz,
  next_run_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedules"
  ON report_schedules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── pg_cron job (run in SQL editor after enabling pg_cron extension) ───────────
-- This calls your edge function every hour to process due schedules.
-- Enable pg_cron first: Dashboard → Database → Extensions → pg_cron

/*
SELECT cron.schedule(
  'send-scheduled-reports',
  '0 * * * *',   -- every hour on the hour
  $$
    SELECT net.http_post(
      url    := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body   := '{}'::jsonb
    );
  $$
);
*/
