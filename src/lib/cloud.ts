import { supabase } from "./supabase";
import type { PlayEvent, Playlist } from "../types";

// Progress-only sync: play events (listening history / Replay stats) and
// playlists are shared across devices through Supabase. Songs themselves
// never leave the device — each device keeps its own copies locally, and
// playlists reference songs by metadata key so they resolve everywhere.

async function userId() {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

/** Push one play event up. No-op when signed out or cloud isn't configured. */
export async function syncPlayEvent(event: PlayEvent) {
  if (!supabase || !(await userId())) return;
  const { error } = await supabase.from("play_events").upsert(event);
  if (error) throw error;
}

/** Push local play events the cloud doesn't have yet (e.g. plays while signed out). */
export async function pushPlayEvents(events: PlayEvent[]) {
  if (!supabase || !(await userId()) || events.length === 0) return;
  const { error } = await supabase.from("play_events").upsert(events);
  if (error) throw error;
}

/** Upsert one playlist to the cloud. No-op when signed out. */
export async function pushPlaylist(playlist: Playlist) {
  if (!supabase || !(await userId())) return;
  const { error } = await supabase.from("playlists").upsert({
    id: playlist.id,
    name: playlist.name,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    trackKeys: playlist.trackKeys,
  });
  if (error) throw error;
}

/** Push local playlists the cloud doesn't have yet (e.g. made while signed out). */
export async function pushPlaylists(playlists: Playlist[]) {
  if (!supabase || !(await userId()) || playlists.length === 0) return;
  const { error } = await supabase.from("playlists").upsert(
    playlists.map((p) => ({
      id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, trackKeys: p.trackKeys,
    })),
  );
  if (error) throw error;
}

export async function removeCloudPlaylist(id: string) {
  if (!supabase || !(await userId())) return;
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Pull play events + playlists from the cloud (and keep pulling as other
 * devices make changes, via realtime). Returns a cleanup function.
 */
export async function hydrateProgress(
  onEvents: (events: PlayEvent[]) => void,
  onPlaylists?: (playlists: Playlist[]) => void,
) {
  if (!supabase || !(await userId())) return () => {};
  const client = supabase;
  const load = async () => {
    const [{ data: events, error: eventError }, { data: playlists, error: playlistError }] =
      await Promise.all([
        client
          .from("play_events")
          .select("id, trackId, title, artist, album, at, secondsPlayed")
          .order("at", { ascending: false }),
        client
          .from("playlists")
          .select("id, name, createdAt, updatedAt, trackKeys")
          .order("createdAt", { ascending: false }),
      ]);
    if (eventError) throw eventError;
    if (playlistError) throw playlistError;
    onEvents((events ?? []) as PlayEvent[]);
    onPlaylists?.((playlists ?? []) as Playlist[]);
  };
  await load();
  const channel = client
    .channel("progress-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "play_events" }, () => void load())
    .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => void load())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
