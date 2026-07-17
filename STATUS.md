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
