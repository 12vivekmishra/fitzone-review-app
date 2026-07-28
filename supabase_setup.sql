-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New Query)

create table review_history (
  id bigint generated always as identity primary key,
  location_id text not null,
  review_text text not null,
  created_at timestamptz default now()
);

create index on review_history (location_id, created_at desc);

alter table review_history enable row level security;

create policy "Anyone can insert" on review_history
  for insert to anon with check (true);

create policy "Anyone can read" on review_history
  for select to anon using (true);
