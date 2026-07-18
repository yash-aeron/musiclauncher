import { supabase } from "./supabase";
import type { PlayEvent, Playlist } from "../types";

// Progress-only sync: play events (listening history / Replay stats) and
// playlists are shared across devices through Supabase. Songs themselves
// never leave the device — each device keeps its own copies locally, and
// playlists reference songs by metadata key so they resolve everywhere.

async function userId() {
  if (!supabase) return undefined;
  // Use the locally-cached session rather than getUser(): getUser() makes a
  // network round-trip on every sync call and rejects when offline, turning a
  // per-event push into a network dependency. getSession() reads local state.
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id;
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
  // Debounce rapid Realtime notifications so concurrent loads can't race (#3).
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight = false;
  let pending = false; // a reload was requested while one was in flight
  const load = async () => {
    if (inflight) {
      // Don't drop this request — run it once the current load finishes, so a
      // burst of edits from another device always ends on the latest state.
      pending = true;
      return;
    }
    inflight = true;
    try {
      const [{ data: events, error: eventError }, { data: playlists, error: playlistError }] =
        await Promise.all([
          // PostgREST caps a plain select at 1000 rows; ask for a large explicit
          // range so full listening history hydrates for heavy users.
          client
            .from("play_events")
            .select("id, trackId, title, artist, album, at, secondsPlayed")
            .order("at", { ascending: false })
            .range(0, 99999),
          client
            .from("playlists")
            .select("id, name, createdAt, updatedAt, trackKeys")
            .order("createdAt", { ascending: false }),
        ]);
      if (eventError) throw eventError;
      if (playlistError) throw playlistError;
      onEvents((events ?? []) as PlayEvent[]);
      onPlaylists?.((playlists ?? []) as Playlist[]);
    } finally {
      inflight = false;
      if (pending) {
        pending = false;
        void load(); // run the reload that arrived mid-flight
      }
    }
  };
  const debouncedLoad = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void load(), 300);
  };
  await load();
  const channel = client
    .channel("progress-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "play_events" }, debouncedLoad)
    .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, debouncedLoad)
    .subscribe();
  return () => {
    if (timer) clearTimeout(timer);
    void client.removeChannel(channel);
  };
}
