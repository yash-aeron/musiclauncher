import { usePlayer } from "../store/player";

/**
 * Wire playback into the OS media session so Android shows a notification with
 * artwork + transport controls (and desktop/Chrome show the same on the lock
 * screen / hardware media keys). Without this the app plays but the phone shows
 * no "now playing" notification at all.
 *
 * Everything is driven off the Zustand store: when the current track, play
 * state, or position changes we push it into `navigator.mediaSession`. The
 * action handlers call straight back into the store's playback actions.
 */
export function setupMediaSession(): () => void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return () => {};
  const ms = navigator.mediaSession;

  // Action handlers only need to be registered once; they read live state.
  const handle = (action: MediaSessionAction, fn: (details: any) => void) => {
    try {
      ms.setActionHandler(action, fn);
    } catch {
      // Some actions aren't supported on every platform — ignore those.
    }
  };

  handle("play", () => {
    if (!usePlayer.getState().playing) usePlayer.getState().togglePlay();
  });
  handle("pause", () => {
    if (usePlayer.getState().playing) usePlayer.getState().togglePlay();
  });
  handle("previoustrack", () => usePlayer.getState().prev());
  handle("nexttrack", () => usePlayer.getState().next());
  handle("seekto", (details: any) => {
    if (typeof details?.seekTime === "number") usePlayer.getState().seek(details.seekTime);
  });
  handle("seekbackward", (details: any) => {
    const { position, seek } = usePlayer.getState();
    seek(Math.max(0, position - (details?.seekOffset || 10)));
  });
  handle("seekforward", (details: any) => {
    const { position, duration, seek } = usePlayer.getState();
    seek(Math.min(duration || position, position + (details?.seekOffset || 10)));
  });
  handle("stop", () => {
    if (usePlayer.getState().playing) usePlayer.getState().togglePlay();
  });

  let lastTrackId: string | null = null;
  let lastPlaying: boolean | null = null;

  const sync = () => {
    const s = usePlayer.getState();
    const track = s.current();

    // Metadata: only rebuild when the track actually changes.
    const trackId = track?.id ?? null;
    if (trackId !== lastTrackId) {
      lastTrackId = trackId;
      if (track) {
        ms.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork: track.artUrl
            ? [
                { src: track.artUrl, sizes: "96x96" },
                { src: track.artUrl, sizes: "256x256" },
                { src: track.artUrl, sizes: "512x512" },
              ]
            : [],
        });
      } else {
        ms.metadata = null;
      }
    }

    // Playback state.
    if (s.playing !== lastPlaying) {
      lastPlaying = s.playing;
      ms.playbackState = track ? (s.playing ? "playing" : "paused") : "none";
    }

    // Position (for the scrubber). Guard against invalid/NaN values.
    if (track && s.duration > 0 && isFinite(s.duration) && s.position <= s.duration) {
      try {
        ms.setPositionState({
          duration: s.duration,
          playbackRate: 1,
          position: Math.max(0, s.position),
        });
      } catch {
        // Invalid combos throw on some engines — safe to skip a frame.
      }
    }
  };

  const unsubscribe = usePlayer.subscribe(sync);
  sync();
  return unsubscribe;
}
