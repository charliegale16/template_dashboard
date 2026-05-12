-- Migration: dashboard layout persistence
-- Run this in your Supabase SQL editor

create table if not exists dashboard_layouts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users not null,
  source_id   uuid        references data_sources on delete cascade not null,
  layout      jsonb       not null default '[]',
  updated_at  timestamptz default now(),
  unique (user_id, source_id)
);

alter table dashboard_layouts enable row level security;

create policy "own dashboard_layouts" on dashboard_layouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
