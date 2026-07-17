# MusicLauncher

A cross-platform music player that blends **Apple Music** (lossless playback + "liquid glass" UI)
and **Spotify** (Wrapped-style listening stats). It ships as a Vercel web app and a separate
Tauri Android app, with an optional Supabase cloud library shared by the same signed-in user.

## Run it

```bash
npm install
npm run dev        # opens http://localhost:5175
```

## Cloud sync, Vercel, and Android

1. Create a Supabase project, then run [`supabase/migrations/20260711_music_sync.sql`](supabase/migrations/20260711_music_sync.sql) in its SQL editor.
2. Copy `.env.example` to `.env.local`, add the project's URL and anon key, and add the same values to Vercel's environment variables. Set Supabase Auth's Site URL and redirect URL to your Vercel domain.
3. Import music while signed in. Files are copied once to a private per-user library namespace in Supabase Storage; any signed-in web or Android device then receives the library and listening history through Realtime.
4. Deploy the web app by importing this repository into Vercel (the included `vercel.json` handles SPA navigation). For Android, run `npm run tauri android init` once, then use `npm run android:dev` for live development or `npm run android:build` for an arm64 standalone APK. Use `npm run android:build:universal` only when one APK must also support 32-bit devices and emulators. CI builds are unsigned unless Android signing credentials are configured. On Windows, Tauri automatically uses Android Studio's bundled JDK.

The mobile build is a separate Android package, but uses the same Supabase login, database, storage bucket, and Realtime feed as the web app.

Open in **Chrome or Edge** for folder import (File System Access API). Firefox falls back
to a multi-file picker. No music on hand? Click **Load demo tracks** — the app synthesizes
real lossless WAV tones in-browser so you can try everything immediately.

## What works today

- **Liquid-glass UI** — frosted `backdrop-filter` panels, and an ambient background whose
  glow is extracted from the current album art and animates on every track change.
- **Local import** — pick a folder; tags, album art, sample rate & bit depth are parsed
  (`music-metadata`) and the library persists in IndexedDB. File handles are stored so
  imported folders survive reloads.
- **Lossless** — FLAC/WAV play natively; **ALAC** (Apple Lossless `.m4a`) is decoded to
  lossless PCM in JS (`@audio/decode-aac`). A **Hi-Res / Lossless** badge is driven by
  real file metadata (>16-bit or >48kHz → Hi-Res).
- **Player** — play/pause, seek, next/prev, shuffle, repeat (all/one), volume, a bottom
  glass bar, and a full-screen ambient Now Playing view. Auto-advance is **gapless**
  (the next track preloads on a second audio element), with an optional crossfade
  (off/3s/6s/12s toggle on the Now Playing screen).
- **Wrapped** — playback logs listening events; the Wrapped page shows top songs, top
  artists, and minutes listened, live.
- **Lyrics** — embedded lyrics (synced ID3 SYLT or plain USLT/vorbis) are parsed on import
  and shown in the Now Playing screen; synced lines auto-scroll, highlight, and are
  tap-to-seek. Add or edit lyrics by hand from **Edit Song Info**.

## Known limits / next steps

- ALAC decoding happens up front (whole file → WAV blob, cached per session), so very long
  ALAC tracks pay a short decode pause before first play.
- Demo/`<input>` imports use in-memory blob URLs and don't survive a reload (only real
  folder imports via file handles do).
- Hand-edited lyrics stay on-device (embedded tags still travel with the file); no online
  lyrics auto-fetch yet.

## Layout

`src/lib` data (import, metadata, colors, db), `src/audio` playback engine,
`src/store/player.ts` Zustand state, `src/components` + `src/pages` UI.
