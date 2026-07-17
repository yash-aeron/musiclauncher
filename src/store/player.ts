import { create } from "zustand";
import { AudioController } from "../audio/AudioController";
import {
  addPlayEvent,
  updatePlayEventSeconds,
  saveTracks,
  savePlaylist,
  deletePlaylist as deletePlaylistDb,
} from "../lib/db";
import { syncPlayEvent, pushPlaylist, removeCloudPlaylist } from "../lib/cloud";
import { trackKey } from "../lib/albums";
import type { Playlist, RepeatMode, Track, ViewName } from "../types";

interface PlayerState {
  // Library + navigation
  library: Track[];
  playlists: Playlist[];
  view: ViewName;
  selectedAlbumKey: string | null; // when set, album-detail is shown
  selectedPlaylistId: string | null; // when set, playlist-detail is shown
  editingTrackId: string | null; // when set, the edit-metadata modal is shown
  addToPlaylistTrackId: string | null; // when set, the add-to-playlist sheet is shown
  nowPlayingOpen: boolean;
  queueOpen: boolean;
  authModalOpen: boolean;
  toast: string | null;

  // Playback
  queue: Track[];
  index: number; // -1 = nothing loaded
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;

  // Actions
  setLibrary: (tracks: Track[]) => void;
  addToLibrary: (tracks: Track[]) => void;
  setView: (v: ViewName) => void;
  openAlbum: (key: string | null) => void;
  openPlaylist: (id: string | null) => void;
  openEditTrack: (id: string | null) => void;
  openAddToPlaylist: (trackId: string | null) => void;
  updateTrack: (id: string, patch: Partial<Pick<Track, "title" | "artist" | "album" | "artUrl">>) => void;
  openNowPlaying: (open: boolean) => void;
  openQueue: (open: boolean) => void;
  openAuthModal: (open: boolean) => void;
  setToast: (msg: string | null) => void;

  // Playlists
  setPlaylists: (playlists: Playlist[]) => void;
  createPlaylist: (name: string, firstTrack?: Track) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, key: string) => void;

  // Queue
  playQueue: (tracks: Track[], startIndex: number) => void;
  playTrackNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (queueIndex: number) => void;
  jumpToQueueIndex: (queueIndex: number) => void;

  togglePlay: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  current: () => Track | null;
}

// --- Play-event accounting (module-scoped, not reactive) ---
let controller: AudioController | null = null;
let listenedSec = 0;
let lastTickTime = 0;
let loggedForIndex = -1;
let loggedEventId: string | null = null; // the play event to finalize on flush

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    // Deterministic-enough jitter without Math.random (blocked in some envs is fine here in browser)
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const usePlayer = create<PlayerState>((set, get) => {
  function ensureController(): AudioController {
    if (controller) return controller;
    controller = new AudioController({
      onTime: (cur, dur) => {
        // Accumulate real listened time between ticks.
        if (lastTickTime && cur > lastTickTime && cur - lastTickTime < 2) {
          listenedSec += cur - lastTickTime;
        }
        lastTickTime = cur;
        set({ position: cur, duration: dur || get().duration });
        maybeLogPlay();
      },
      onEnded: () => {
        flushPlay();
        get().next(true);
      },
      onPlayingChange: (p) => set({ playing: p }),
      onError: (msg) => set({ toast: msg }),
    });
    return controller;
  }

  function maybeLogPlay() {
    const { index, queue } = get();
    if (index < 0 || loggedForIndex === index) return;
    const track = queue[index];
    if (!track) return;
    const threshold = Math.min(20, (track.durationSec || 30) * 0.5);
    if (listenedSec >= threshold) {
      loggedForIndex = index;
      const id = `pe-${Date.now().toString(36)}-${index}`;
      loggedEventId = id;
      const event = {
        id,
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        at: Date.now(),
        secondsPlayed: Math.round(listenedSec),
      };
      void addPlayEvent(event);
      void syncPlayEvent(event).catch(() => {});
    }
  }

  function flushPlay() {
    // Finalize the in-flight event with the *actual* seconds listened, not the
    // ~threshold amount frozen when the play was first counted.
    if (loggedEventId && listenedSec >= 1) {
      void updatePlayEventSeconds(loggedEventId, Math.round(listenedSec)).then((event) => {
        if (event) void syncPlayEvent(event).catch(() => {});
      });
    }
    loggedEventId = null;
    listenedSec = 0;
    lastTickTime = 0;
  }

  function loadIndex(index: number) {
    const { queue } = get();
    const track = queue[index];
    if (!track) return;
    flushPlay();
    loggedForIndex = -1;
    set({ index, position: 0, duration: track.durationSec || 0 });
    ensureController().loadAndPlay(track);
  }

  return {
    library: [],
    playlists: [],
    view: "albums",
    selectedAlbumKey: null,
    selectedPlaylistId: null,
    editingTrackId: null,
    addToPlaylistTrackId: null,
    nowPlayingOpen: false,
    queueOpen: false,
    authModalOpen: false,
    toast: null,

    queue: [],
    index: -1,
    playing: false,
    position: 0,
    duration: 0,
    volume: 1,
    shuffle: false,
    repeat: "off",

    setLibrary: (tracks) => set({ library: tracks }),
    addToLibrary: (tracks) =>
      set((s) => ({ library: [...tracks, ...s.library] })),
    setView: (view) => set({ view, selectedAlbumKey: null, selectedPlaylistId: null }),
    openAlbum: (selectedAlbumKey) => set({ selectedAlbumKey }),
    openPlaylist: (selectedPlaylistId) => set({ selectedPlaylistId }),
    openEditTrack: (editingTrackId) => set({ editingTrackId }),
    openAddToPlaylist: (addToPlaylistTrackId) => set({ addToPlaylistTrackId }),
    updateTrack: (id, patch) => {
      const apply = (t: Track): Track => (t.id === id ? { ...t, ...patch } : t);
      const library = get().library.map(apply);
      const queue = get().queue.map(apply);
      set({ library, queue });
      // Persist the edited track (and refresh Now Playing art/title live).
      const edited = library.find((t) => t.id === id);
      if (edited) void saveTracks([edited]);
    },
    openNowPlaying: (nowPlayingOpen) => set({ nowPlayingOpen }),
    openQueue: (queueOpen) => set({ queueOpen }),
    openAuthModal: (authModalOpen) => set({ authModalOpen }),
    setToast: (toast) => set({ toast }),

    // --- Playlists (persisted locally + synced to the cloud when signed in) ---
    setPlaylists: (playlists) => set({ playlists }),

    createPlaylist: (name, firstTrack) => {
      const playlist: Playlist = {
        id: `pl-${Date.now().toString(36)}-${get().playlists.length}`,
        name: name.trim() || "New Playlist",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        trackKeys: firstTrack ? [trackKey(firstTrack)] : [],
      };
      set((s) => ({ playlists: [playlist, ...s.playlists] }));
      void savePlaylist(playlist);
      void pushPlaylist(playlist).catch(() => {});
      return playlist;
    },

    renamePlaylist: (id, name) => {
      const playlists = get().playlists.map((p) =>
        p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p,
      );
      set({ playlists });
      const updated = playlists.find((p) => p.id === id);
      if (updated) {
        void savePlaylist(updated);
        void pushPlaylist(updated).catch(() => {});
      }
    },

    deletePlaylist: (id) => {
      set((s) => ({
        playlists: s.playlists.filter((p) => p.id !== id),
        selectedPlaylistId: s.selectedPlaylistId === id ? null : s.selectedPlaylistId,
      }));
      void deletePlaylistDb(id);
      void removeCloudPlaylist(id).catch(() => {});
    },

    addTrackToPlaylist: (playlistId, track) => {
      const key = trackKey(track);
      const playlists = get().playlists.map((p) => {
        if (p.id !== playlistId || p.trackKeys.includes(key)) return p;
        return { ...p, trackKeys: [...p.trackKeys, key], updatedAt: Date.now() };
      });
      set({ playlists });
      const updated = playlists.find((p) => p.id === playlistId);
      if (updated) {
        void savePlaylist(updated);
        void pushPlaylist(updated).catch(() => {});
      }
    },

    removeTrackFromPlaylist: (playlistId, key) => {
      const playlists = get().playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackKeys: p.trackKeys.filter((k) => k !== key), updatedAt: Date.now() }
          : p,
      );
      set({ playlists });
      const updated = playlists.find((p) => p.id === playlistId);
      if (updated) {
        void savePlaylist(updated);
        void pushPlaylist(updated).catch(() => {});
      }
    },

    // --- Queue ---
    playQueue: (tracks, startIndex) => {
      const queue = get().shuffle ? shuffled(tracks) : tracks;
      // If shuffled, keep the chosen track first.
      let idx = startIndex;
      if (get().shuffle) {
        const chosen = tracks[startIndex];
        const at = queue.indexOf(chosen);
        if (at > 0) {
          queue.splice(at, 1);
          queue.unshift(chosen);
        }
        idx = 0;
      }
      set({ queue });
      loadIndex(idx);
    },

    playTrackNext: (track) => {
      const { queue, index } = get();
      if (index < 0) {
        get().playQueue([track], 0);
        return;
      }
      const q = queue.slice();
      q.splice(index + 1, 0, track);
      set({ queue: q });
    },

    addToQueue: (track) => {
      const { queue, index } = get();
      if (index < 0) {
        get().playQueue([track], 0);
        return;
      }
      set({ queue: [...queue, track] });
    },

    removeFromQueue: (queueIndex) => {
      const { queue, index } = get();
      if (queueIndex === index) return; // can't remove the playing track
      const q = queue.slice();
      q.splice(queueIndex, 1);
      set({ queue: q, index: queueIndex < index ? index - 1 : index });
    },

    jumpToQueueIndex: (queueIndex) => {
      if (queueIndex >= 0 && queueIndex < get().queue.length) loadIndex(queueIndex);
    },

    togglePlay: () => {
      const c = ensureController();
      if (get().playing) c.pause();
      else c.play();
    },

    next: (auto = false) => {
      const { index, queue, repeat } = get();
      if (queue.length === 0) return;
      // A track that ended naturally with repeat-one replays itself.
      if (auto && repeat === "one") {
        loadIndex(index);
        return;
      }
      const atEnd = index + 1 >= queue.length;
      if (atEnd) {
        // End of queue: wrap if repeating all, or if the user pressed next.
        if (repeat === "all" || !auto) loadIndex(0);
        else set({ playing: false }); // auto-advance with repeat off → stop
        return;
      }
      loadIndex(index + 1);
    },

    prev: () => {
      const { index, position } = get();
      if (position > 3) {
        get().seek(0);
        return;
      }
      loadIndex(Math.max(0, index - 1));
    },

    seek: (sec) => {
      ensureController().seek(sec);
      set({ position: sec });
      lastTickTime = sec;
    },

    setVolume: (v) => {
      ensureController().setVolume(v);
      set({ volume: v });
    },

    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
    cycleRepeat: () =>
      set((s) => ({
        repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
      })),

    current: () => {
      const { queue, index } = get();
      return index >= 0 ? queue[index] ?? null : null;
    },
  };
});
