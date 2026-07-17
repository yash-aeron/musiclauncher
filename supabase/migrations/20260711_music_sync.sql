-- Migration: 20260711_music_sync (Initial Schema)
-- Description: Creates the play_events and tracks tables for tracking listens across devices.
create table if not exists public.tracks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  title text not null,
  artist text not null,
  album text not null,
  "trackNo" integer,
  year integer,
  genre text,
  "durationSec" numeric not null,
  codec text not null,
  "sampleRate" integer,
  "bitDepth" integer,
  bitrate integer,
  tier text not null check (tier in ('hi-res', 'lossless', 'lossy')),
  "artUrl" text,
  source_path text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.play_events (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  "trackId" text not null,
  title text not null,
  artist text not null,
  album text not null,
  at bigint not null,
  "secondsPlayed" integer not null,
  primary key (user_id, id)
);

alter table public.tracks enable row level security;
alter table public.play_events enable row level security;
drop policy if exists "Users manage their tracks" on public.tracks;
drop policy if exists "Users manage their play events" on public.play_events;
create policy "Users manage their tracks" on public.tracks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their play events" on public.play_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict (id) do update set public = false;
drop policy if exists "Users manage their audio" on storage.objects;
create policy "Users manage their audio" on storage.objects for all using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tracks') then
    alter publication supabase_realtime add table public.tracks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'play_events') then
    alter publication supabase_realtime add table public.play_events;
  end if;
end $$;
