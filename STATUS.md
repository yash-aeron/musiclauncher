# Project Status — 2026-07-17 (updated)

## What this is

MusicLauncher: a cross-platform music player blending Apple Music (lossless playback, liquid-glass UI)
and Spotify (Wrapped-style stats). Ships as a Vercel web app and a Tauri Android app, with optional
Supabase cloud sync. See [README.md](README.md) for setup.

## Current status

- **Build:** clean — `tsc` and `npm run build` both pass with no errors.
- **Deployed:** live at https://musiclauncher.vercel.app (production, deployed 2026-07-17).
- **Git:** two commits — initial commit plus code-splitting/demo-persistence work.

## Working features

- Liquid-glass UI with ambient background extracted from album art
- Local folder/file import with tag, art, sample-rate and bit-depth parsing (persists in IndexedDB)
- True lossless FLAC/WAV playback with Hi-Res / Lossless badge
- Full player: play/pause, seek, next/prev, shuffle, repeat, volume, queue, Now Playing screen
- Playlists (page + Supabase migration `20260716_playlists.sql`)
- Wrapped page: top songs, top artists, minutes listened
- Supabase cloud sync: auth, per-user storage library, Realtime feed shared with Android
- Demo tracks (in-browser synthesized lossless WAV) for trying the app without music files
- **Library search** *(new)*
- **ALAC (Apple Lossless) playback** *(new)* — decoded to lossless PCM in JS
- **Gapless playback + optional crossfade** *(new)*

## Changes made 2026-07-17

1. **Library search** (`src/pages/LibraryPage.tsx`) — search input in the library header filters
   by title, artist, or album across the Songs, Albums, and Artists views, with a "no matches"
   empty state. Hidden while the library is empty.
2. **Deployed to Vercel production** — verified the alias returns 200 and serves the new build.
3. **Initial git commits** — the whole project is now under version control (was previously
   an empty repo with everything untracked).
4. **Code-splitting** (`vite.config.ts`) — vendor `manualChunks` split the single 681 kB bundle
   into react (256 kB), supabase (214 kB), music-metadata (101 kB), vibrant (28 kB), and an
   81 kB app chunk, so they load in parallel and cache independently.
5. **Demo tracks survive reload** (`src/lib/demo.ts`) — demo WAVs are now saved to the IndexedDB
   blob store (same path as imported files) instead of throwaway in-memory object URLs.
6. **ALAC playback** — new `src/audio/alac.ts` decodes Apple Lossless in JS
   (`@audio/decode-aac`, pure-JS port of Apple's reference decoder) and wraps the PCM in a
   32-bit-float WAV blob URL, cached per track for the session. `resolveSource.ts` routes any
   track whose codec matches `/alac/i` through it. **Verified:** decoded an ffmpeg-generated
   ALAC file in Node — correct sample rate, frame count, and a clean 440 Hz sine came out.
7. **Gapless playback + crossfade** — `AudioController` rewritten on two `<audio>` elements:
   the idle one preloads the upcoming queue track, so auto-advance is an instant swap. Optional
   equal-power crossfade (store setting `crossfadeSec`, persisted to localStorage) starts the
   next track `crossfadeSec` before the end and fades the two elements. The player store
   preloads on track load and on queue/repeat changes; the Now Playing screen has a
   "Fade off / 3s / 6s / 12s" toggle next to Queue.

## Known limits / next steps

- ALAC decode is session-cached per track; decoded WAVs are held in memory (fine for a queue,
  could grow for huge ALAC libraries)
- Crossfade advances the play counter at the fade point (a few seconds early) — acceptable
  for stats purposes
- Later: animated story-style Wrapped, lyrics
