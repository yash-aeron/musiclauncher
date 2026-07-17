create table if not exists public.playlists (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  name text not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "trackKeys" jsonb not null default '[]'::jsonb,
  primary key (user_id, id)
);

alter table public.playlists enable row level security;
drop policy if exists "Users manage their playlists" on public.playlists;
create policy "Users manage their playlists" on public.playlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'playlists') then
    alter publication supabase_realtime add table public.playlists;
  end if;
end $$;
