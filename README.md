<div align="center">
  
# 🎵 MusicLauncher

**The Cross-Platform, Lossless Music Player of the Future.**

<p align="center">
  <img src="https://img.shields.io/badge/react-black?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/tauri-black?style=for-the-badge&logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/supabase-black?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/typescript-black?style=for-the-badge&logo=typescript" alt="TypeScript" />
</p>

*MusicLauncher blends the liquid-glass aesthetics and lossless audio of Apple Music with the hyper-personalized stats of Spotify Wrapped—available everywhere on the Web and Android.*

</div>

---

## ✨ Features

- 💧 **Liquid-Glass UI**: Immersive, frosted `backdrop-filter` panels with an ambient glow that dynamically extracts colors from the current album art and smoothly animates on track changes.
- 🎧 **Lossless & Hi-Res Audio**: Native FLAC/WAV playback. ALAC (`.m4a`) is fully decoded in JavaScript to lossless PCM. An intelligent Hi-Res badge appears based on real file metadata (>16-bit or >48kHz).
- 📱 **Cross-Platform**: Deploy as a Vercel Web App or a native Tauri Android application sharing the exact same codebase.
- ☁️ **Cloud Library Sync**: Sync your music across devices seamlessly via Supabase. Music is securely stored in a private bucket and synced using Supabase Realtime.
- 🔄 **Gapless Playback & Crossfade**: Flawless auto-advancing with a preloading dual-audio-element engine. Customize crossfading between 3s, 6s, 12s, or off.
- 📊 **Live Wrapped Stats**: Every listen is logged. Your "Wrapped" page continuously updates your top songs, top artists, and total listening time.
- 🎤 **Synchronized Lyrics**: Parses embedded lyrics (ID3 SYLT, USLT/vorbis). Synced lines auto-scroll and highlight like karaoke. Tap any line to instantly seek to that moment in the track.

## 🚀 Getting Started

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the local development server**
   ```bash
   npm run dev
   ```
   > Opens at `http://localhost:5175`

*No music on hand? Just click **Load demo tracks** on the welcome screen. The app synthesizes real lossless WAV tones in the browser so you can test the player immediately.*

### ☁️ Cloud Sync & Deployment

1. **Supabase Setup**: 
   - Create a new Supabase project.
   - Run the migration file in the SQL editor: [`supabase/migrations/20260711_music_sync.sql`](supabase/migrations/20260711_music_sync.sql).
   
2. **Environment Variables**:
   - Copy `.env.example` to `.env.local` and add your Supabase project URL and anon key.
   - Set up Supabase Auth redirect URLs to point to your Vercel deployment domain.

3. **Deploy Web**:
   - Import the repository into Vercel. The included `vercel.json` will automatically handle SPA routing.

4. **Deploy Android (Tauri)**:
   - Initialize Tauri: `npm run tauri android init`
   - Run Android dev environment: `npm run android:dev`
   - Build a standalone APK: `npm run android:build` (Use `npm run android:build:universal` for 32-bit/emulator support).

## 📂 Project Structure

| Directory | Purpose |
| :--- | :--- |
| `src/components/` | React UI components (Play controls, glass layouts, badges) |
| `src/pages/` | Application views (Library, Wrapped, Now Playing) |
| `src/store/` | Zustand state management (`player.ts`) |
| `src/audio/` | Core audio engine (Gapless logic, ALAC decoders) |
| `src/lib/` | Helpers (Metadata parsing, colors, indexedDB, cloud sync) |
| `src-tauri/` | Rust-based Tauri backend for Android and Desktop builds |

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion
- **State**: Zustand
- **Audio**: Web Audio API, `music-metadata`, `@audio/decode-aac`
- **Backend & DB**: Supabase (Auth, Postgres, Storage, Realtime)
- **Native Wrap**: Tauri (Android support)

## 📌 Known Limitations
- ALAC decoding is front-loaded to memory, meaning very large ALAC tracks may have a brief pause before the first playback begins.
- Demo track imports use in-memory blob URLs and will reset upon reloading the page. (Real folder imports persist via File System Access API handles).

---
<div align="center">
  <i>Built for the love of high-fidelity music.</i>
</div>
