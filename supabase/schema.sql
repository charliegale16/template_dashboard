-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Data sources (one per CSV upload or Google Sheet)
create table if not exists data_sources (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users not null,
  name        text        not null,
  type        text        not null check (type in ('csv', 'excel', 'sheet')),
  headers     text[]      not null default '{}',
  row_count   int         not null default 0,
  meta        jsonb       not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Raw row data as JSONB
create table if not exists data_rows (
  id          bigserial   primary key,
  source_id   uuid        references data_sources on delete cascade not null,
  user_id     uuid        references auth.users not null,
  row_index   int         not null,
  data        jsonb       not null
);
create index if not exists data_rows_source_idx on data_rows (source_id, row_index);

-- KPI definitions
create table if not exists kpis (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users not null,
  source_id   uuid        references data_sources on delete cascade not null,
  name        text        not null,
  formula     jsonb       not null,
  format      text        not null default 'number' check (format in ('number', 'currency', 'percent')),
  color       text        not null default 'blue',
  sort_order  int         not null default 0,
  created_at  timestamptz default now()
);

-- Row Level Security
alter table data_sources enable row level security;
alter table data_rows     enable row level security;
alter table kpis          enable row level security;

create policy "own data_sources" on data_sources for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own data_rows" on data_rows for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own kpis" on kpis for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
