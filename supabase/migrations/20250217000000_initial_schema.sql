-- Music Notebook: profiles, songs, albums, album_songs
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  updated_at timestamptz default now()
);

-- Songs (user-owned)
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  duration_seconds integer,
  duration_display text,
  audio_path text,
  is_released boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Albums (user-owned)
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cover_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Album tracks (song order)
create table if not exists public.album_songs (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null default 0,
  unique(album_id, song_id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.albums enable row level security;
alter table public.album_songs enable row level security;

-- Profiles: own row only
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Songs: own rows only
create policy "Users can CRUD own songs" on public.songs for all using (auth.uid() = user_id);

-- Albums: own rows only
create policy "Users can CRUD own albums" on public.albums for all using (auth.uid() = user_id);

-- Album_songs: via album ownership
create policy "Users can manage album_songs for own albums"
  on public.album_songs for all
  using (
    exists (select 1 from public.albums a where a.id = album_songs.album_id and a.user_id = auth.uid())
  );
create policy "Users can insert album_songs for own albums"
  on public.album_songs for insert
  with check (
    exists (select 1 from public.albums a where a.id = album_songs.album_id and a.user_id = auth.uid())
  );

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: In Supabase Dashboard > Storage, create buckets 'audio' and 'covers' (private).
-- Then add policies: allow insert/select/update/delete where bucket_id = 'audio' (or 'covers')
--   and (storage.foldername(name))[1] = auth.uid()::text (path format: userId/filename)
