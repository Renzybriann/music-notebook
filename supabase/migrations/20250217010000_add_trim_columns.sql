-- Add trim start/end columns for song clip selection (like Instagram)
alter table public.songs add column if not exists start_time_seconds numeric;
alter table public.songs add column if not exists end_time_seconds numeric;
