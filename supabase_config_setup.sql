-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New Query)
-- This lets Admin panel changes (business name, Google review link,
-- highlights, locations, logo) sync across every device instead of
-- being stuck in one browser's localStorage.

create table app_config (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table app_config enable row level security;

create policy "Anyone can read config" on app_config
  for select to anon using (true);

create policy "Anyone can insert config" on app_config
  for insert to anon with check (true);

create policy "Anyone can update config" on app_config
  for update to anon using (true);
