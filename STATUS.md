# Project Status — 2026-07-17

## What this is

MusicLauncher: a cross-platform music player blending Apple Music (lossless playback, liquid-glass UI)
and Spotify (Wrapped-style stats). Ships as a Vercel web app and a Tauri Android app, with optional
Supabase cloud sync. See [README.md](README.md) for setup.

## Current status

- **Build:** clean — `tsc` and `npm run build` both pass with no errors.
- **Deployed:** live at https://musiclauncher.vercel.app (production, deployed 2026-07-17).
- **Git:** repository initialized but has **zero commits** — all files untracked. Deploys work
  because Vercel CLI uploads the working directory directly, but there is no history or rollback.

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

## Changes made 2026-07-17

1. **Library search** (`src/pages/LibraryPage.tsx`) — search input in the library header filters
   by title, artist, or album across the Songs, Albums, and Artists views, with a "no matches"
   empty state. Hidden while the library is empty.
2. **Deployed to Vercel production** — verified the alias returns 200 and serves the new build.

## Known limits / next steps

- ALAC (`.m4a`) shows in the library but won't play in the browser (no native decoder)
- Demo/file-picker imports use in-memory blob URLs and don't survive reload (folder imports do)
- Main JS bundle is 681 kB minified — add code-splitting (`manualChunks`) if load time matters
- No initial git commit yet
- Later: gapless/crossfade, animated story-style Wrapped, lyrics
