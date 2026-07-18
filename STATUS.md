# Project Status - 2026-07-17 (updated)

## What this is

MusicLauncher is a cross-platform music player blending Apple Music lossless playback and liquid-glass UI with Spotify Wrapped-style stats. It ships as a Vercel web app and a Tauri Android app, with optional Supabase cloud sync. See [README.md](README.md) for setup.

## Current status

- **Build:** clean - `tsc` and `npm run build` pass with no errors.
- **Deployed:** live at https://musiclauncher.vercel.app (production, deployed 2026-07-17).
- **Android:** fresh arm64 release APK built at `src-tauri/gen/android/app/build/outputs/apk/arm64/release/`. It is unsigned until Android signing credentials are configured.
- **Git:** four local commits, including `6b4c1b2 Add animated Replay story`. No remote is configured.

## Working features

- Liquid-glass UI with ambient background extracted from album art
- Local folder/file import with tag, art, sample-rate and bit-depth parsing (persists in IndexedDB)
- True lossless FLAC/WAV playback with Hi-Res / Lossless badge
- Full player: play/pause, seek, next/prev, shuffle, repeat, volume, queue, Now Playing screen
- Playlists (page + Supabase migration `20260716_playlists.sql`)
- Replay: top songs, top artists, minutes listened, and animated story scenes
- Supabase cloud sync: auth, per-user storage library, Realtime feed shared with Android
- Demo tracks (in-browser synthesized lossless WAV) for trying the app without music files
- Library search
- ALAC (Apple Lossless) playback, decoded to lossless PCM in JavaScript
- Gapless playback with optional crossfade
- Lyrics view: synced/unsynced, tap-to-seek, editable

## Changes made 2026-07-17

1. **Library search** (`src/pages/LibraryPage.tsx`): search by title, artist, or album across Songs, Albums, and Artists, including a no-matches state.
2. **Production web deployment:** Vercel serves the current build at https://musiclauncher.vercel.app.
3. **Version control:** the project is under Git with the current Replay work committed locally.
4. **Code splitting** (`vite.config.ts`): vendor chunks for React, Supabase, music-metadata, Vibrant, and the app.
5. **Persistent demo tracks** (`src/lib/demo.ts`): demo WAVs save in IndexedDB like imported music.
6. **ALAC playback** (`src/audio/alac.ts`): Apple Lossless is decoded to cached lossless PCM WAV for playback.
7. **Gapless playback and crossfade:** two audio elements preload upcoming tracks; the Now Playing screen provides off, 3s, 6s, and 12s fade settings.
8. **Lyrics:** import synced ID3 SYLT, unsynced USLT, and Vorbis lyrics where available. The Now Playing screen auto-centers synced lyrics, highlights the active line, supports tap-to-seek, and allows manual editing.
9. **Animated Replay story:** the Wrapped page is now a sequence of listening moments: intro, total time, top song, top artist, and a ranked listening stack. It uses local album art, scroll snapping, and reduced-motion-safe reveals.
10. **Release delivery:** deployed the current web build to Vercel production and rebuilt the arm64 Android APK. Git and Play Store publication remain pending their respective remote and signing configuration.

## Known limits / next steps

- ALAC decode is session-cached per track; decoded WAVs can grow memory use for huge libraries.
- Crossfade advances the play counter at the fade point, a few seconds early.
- Hand-edited lyrics stay on-device; there is no online lyrics auto-fetch.

## Changes made 2026-07-18 — Online streaming (YouTube) + Android fixes

Not committed to git yet. Rust changes require a full `npm run android:dev`
restart (no hot-reload).

### Working

- **YouTube search & playback** — InnerTube `ANDROID_VR` client routed through a
  Rust `yt_fetch` command (`src-tauri/src/lib.rs`, uses `reqwest`). Rust owns all
  headers, which avoids YouTube's 403-on-foreign-`Origin`: the WebView injects
  `Origin: http://tauri.localhost` and JS can't override it (`Origin`/`Referer`
  are forbidden fetch headers). `visitorData` is scraped from the homepage with a
  desktop Chrome UA. Adapter: `src/lib/sources/youtube.ts`. Confirmed on device.
- **Back button** (`src/lib/androidBack.ts`) — hardware/gesture back closes the
  topmost overlay / returns to the library instead of exiting on first press.
  Android-only. Confirmed on device.
- **Imported songs play on Android** — native files are now served as a
  `blob:` URL read on demand (`nativeBlobUrl` in `src/platform/tauri.ts`) instead
  of via `asset://`. Android aliases the app data dir (`/data/data/<pkg>` vs
  `/data/user/0/<pkg>`), so the asset-protocol scope match was unreliable and a
  miss gave the `<audio>` a "no supported sources found" error. The blob path is
  the same one the web build uses and always decodes. Desktop keeps `asset://`
  streaming. (No DOM-attach — the two `<audio>` elements stay detached.)
- **Three-dots menu overlap** (`src/components/TrackMenu.tsx`) — menu now renders
  in a portal with fixed positioning that flips above/left near screen edges.
- **`play() interrupted by pause()`** — load-generation guard in
  `AudioController.loadAndPlay`; superseded loads bail and the benign
  `AbortError` is swallowed.
- **Download for YouTube results** — `youtubeSource.download()` pulls the audio
  bytes through the Rust `yt_download` command (`invoke<ArrayBuffer>`) because
  googlevideo sends no CORS headers. It now prefers the **m4a/AAC** format (the
  WebView decodes AAC reliably; a downloaded opus blob failed as "no supported
  sources" on some devices) and Rust has a 90s timeout so a stalled connection
  can't hang the spinner forever. Saved as an offline `blob` track. New
  `DownloadIcon` in `src/components/Icons.tsx`.
- **Lyrics for streamed songs** — `src/lib/lyrics.ts` fetches timed/plain lyrics
  from LRCLIB on play for any track lacking embedded lyrics; cached onto the
  track. Wired in `player.ts` `loadIndex` → `ensureLyrics`. `lrclib.net` added to
  the CSP `connect-src` in `tauri.conf.json` (it was being silently blocked).

### Still needs on-device verification

- **Media notification** — JS side fully wired (elements in DOM + rendered +
  `navigator.mediaSession` metadata + action handlers, `src/lib/mediaSession.ts`).
  Android System WebView's media-notification support is version-dependent and
  historically unreliable (a Chrome-app feature, not guaranteed in WebView). If
  it still doesn't show after a fresh build, the reliable fix is a native Android
  MediaSession + foreground-service plugin bridged to the WebView — a substantial
  native addition, not yet built.

## Code review 2026-07-18 — bug sweep (not committed)

A full multi-file review (data layer, audio engine, components, Rust/sources).
All fixes compile clean (`tsc -b` + `cargo check`). Highlights:

- **Deleting the currently-playing track kept playing it** (`store/player.ts`) —
  the queue was filtered and the index clamped, but the `<audio>` element was
  never told to stop, so audio played the deleted song while the UI showed a
  different one. Now redirects to the track that fills the slot, or stops
  cleanly if the queue empties. (Critical.)
- **Audius broken in the Tauri build** — `connect-src` didn't list Audius, so
  every search was CSP-blocked. Reworked `sources/audius.ts` to use stable
  first-party `*.audius.co` discovery nodes with failover (no more third-party
  bootstrap domains a strict CSP can't enumerate) and whitelisted `*.audius.co`.
- **Auth-change sync leak** (`App.tsx`) — a no-op abort guard
  (`aborted = true; aborted = false`) let an in-flight sync survive an auth
  change and overwrite the subscription handle, leaking a realtime listener.
  Replaced with a generation guard that tears down the old subscription.
- **Over-broad fs capability** — `fs:allow-write-file/mkdir/remove` were scoped
  to `**` (whole filesystem). Narrowed to `$APPLOCALDATA/**`, the only place the
  app writes. Read stays broad for desktop imports.
- **`yt_fetch` had no timeout** — a stalled InnerTube request hung search/resolve
  forever. Added a 30s cap (matches `yt_download`'s existing timeout).
- **YouTube session token could die for the whole session** — a malformed-token
  `JSON.parse` threw outside the retry guard, caching a rejected promise.
  Wrapped so any failure clears the cache and a later call retries.
- **Streaming opus on Android** — `resolveStream` returned the highest-bitrate
  audio (often opus/webm, which Android WebView can't decode). Now prefers m4a on
  Android, matching the download path.
- **LRU could revoke the playing URL mid-song** (`platform/constants.ts`) —
  `ObjectUrlCache.get` didn't refresh recency, so the active track drifted to the
  oldest slot and got revoked. `get` now moves the entry to newest.
- **Crossfade/preload races** (`audio/AudioController.ts`) — preload no longer
  overwrites the still-fading element; the gapless branch re-checks the load
  generation before crossfading; stream URLs are no longer pre-buffered (they
  expire) and cold-resolve on advance.
- **Cloud sync** (`lib/cloud.ts`) — `userId()` now reads the local session
  (`getSession`) instead of a network `getUser()` per call; the reload debounce
  no longer drops the trailing update; `play_events` pull paginates past the
  1000-row PostgREST cap.
- **IndexedDB atomicity** (`lib/db.ts`) — `deleteTrack` and
  `updatePlayEventSeconds` now use single transactions (no orphaned blobs, no
  lost-update on overlapping scrobble writes).
- **Android back on cold launch** (`lib/androidBack.ts`) — when nothing is open
  and the app is the first history entry, `history.back()` no-op'd and stranded
  the handler; now closes the native window (with a history fallback).
- **mediaSession leak** (`lib/mediaSession.ts`) — the store subscription was
  never unsubscribed; StrictMode/HMR/remount stacked duplicates. Now returns a
  cleanup wired into the `App.tsx` effect.

### Known limits (not fixed — intentional)

- **Playlist cloud sync is last-write-wins** — concurrent edits to the *same*
  playlist on two devices within the sync window can lose one side's change.
  A true merge needs a Postgres stored procedure; deferred as low-value for a
  single-user app. The pull path already does newest-`updatedAt`-wins.
- **`nativeBlobUrl` reads whole files into memory** (Android) — reliable
  playback tradeoff; heavy for very large FLACs. Durable fix is a native
  streaming plugin.
