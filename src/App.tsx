import { useEffect } from "react";
import { usePlayer } from "./store/player";
import { getAllTracks, getAllPlayEvents, addPlayEvent, getAllPlaylists, savePlaylist } from "./lib/db";
import { hydrateProgress, pushPlayEvents, pushPlaylists } from "./lib/cloud";
import { supabase } from "./lib/supabase";
import { AmbientBackground } from "./components/AmbientBackground";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { NowPlayingScreen } from "./components/NowPlayingScreen";
import { EditTrackModal } from "./components/EditTrackModal";
import { AuthModal } from "./components/AuthModal";
import { Toast } from "./components/Toast";
import { LibraryPage } from "./pages/LibraryPage";
import { PlaylistsPage } from "./pages/PlaylistsPage";
import { SearchPage } from "./pages/SearchPage";
import { AddToPlaylistSheet } from "./components/AddToPlaylistSheet";
import { MobileNav } from "./components/MobileNav";
import { WrappedPage } from "./pages/WrappedPage";
import { setupMediaSession } from "./lib/mediaSession";
import { setupAndroidBack } from "./lib/androidBack";
import { isAndroid } from "./platform";

export default function App() {
  const view = usePlayer((s) => s.view);
  const setLibrary = usePlayer((s) => s.setLibrary);
  const authModalOpen = usePlayer((s) => s.authModalOpen);
  const openAuthModal = usePlayer((s) => s.openAuthModal);

  useEffect(() => {
    // OS media session: notification + lock-screen controls on Android, and
    // hardware media keys on desktop/web. Returns an unsubscribe so a remount
    // (StrictMode / HMR) doesn't stack duplicate store subscribers.
    return setupMediaSession();
  }, []);

  useEffect(() => {
    // Android: keep the hardware/gesture back button inside the app (close
    // overlays/return to the library) instead of exiting on the first press.
    if (!isAndroid) return;
    return setupAndroidBack();
  }, []);

  useEffect(() => {
    // Restore the library from local storage. Every persistable source
    // survives a reload: blobs (audio copied into IndexedDB), legacy file
    // handles, and native paths (Tauri). In-memory object URLs (demo tracks)
    // and stale kinds from older versions are dropped.
    const keep = new Set(["blob", "file-handle", "native", "stream"]);
    getAllTracks().then((tracks) => {
      setLibrary(tracks.filter((t) => keep.has(t.source.kind)));
    });
    getAllPlaylists().then((playlists) => {
      usePlayer.getState().setPlaylists(playlists.sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [setLibrary]);

  useEffect(() => {
    // Progress-only sync: merge cloud play events + playlists into the local
    // store and push up anything the cloud missed. Songs stay on-device.
    let stop = () => {};
    // Generation guard: each (re)start bumps `gen`; an in-flight start whose
    // gen is stale aborts instead of overwriting `stop` with a subscription
    // that would then leak. Auth changes (sign in/out, token refresh) restart.
    let gen = 0;
    const start = async () => {
      const myGen = ++gen;
      stop(); // tear down any previous subscription before starting a new one
      stop = () => {};
      try {
        const [localEvents, localPlaylists] = await Promise.all([getAllPlayEvents(), getAllPlaylists()]);
        if (myGen !== gen) return;
        await pushPlayEvents(localEvents);
        await pushPlaylists(localPlaylists);
        if (myGen !== gen) return;
        const cleanup = await hydrateProgress(
          (events) => {
            events.forEach((event) => void addPlayEvent(event));
          },
          (cloudPlaylists) => {
            // Merge by id, newest updatedAt wins, so edits from another
            // device land here without clobbering newer local changes.
            const byId = new Map(usePlayer.getState().playlists.map((p) => [p.id, p]));
            for (const cp of cloudPlaylists) {
              const local = byId.get(cp.id);
              if (!local || cp.updatedAt > local.updatedAt) {
                byId.set(cp.id, cp);
                void savePlaylist(cp);
              }
            }
            usePlayer.getState().setPlaylists([...byId.values()].sort((a, b) => b.createdAt - a.createdAt));
          },
        );
        // A newer start superseded us while hydrateProgress was awaiting — tear
        // down the subscription we just made instead of leaking it.
        if (myGen !== gen) {
          cleanup();
          return;
        }
        stop = cleanup;
      } catch {
        // Offline or signed out — local stats keep working.
      }
    };
    void start();
    const { data } = supabase?.auth.onAuthStateChange(() => void start()) ?? {
      data: { subscription: { unsubscribe() {} } },
    };
    return () => {
      gen++; // invalidate any in-flight start
      stop();
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <AmbientBackground />

      <TopBar />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* SearchPage stays mounted (hidden) across tab switches so the
              query, results and in-flight download spinners survive — before,
              visiting Albums and returning reset the whole search page. */}
          <div className={view === "search" ? "h-full" : "hidden"}>
            <SearchPage />
          </div>
          {view === "search" ? null : view === "replay" ? <WrappedPage /> : view === "playlists" ? <PlaylistsPage /> : <LibraryPage />}
        </main>
        <MobileNav />
      </div>

      <NowPlayingScreen />
      <EditTrackModal />
      <AddToPlaylistSheet />
      {authModalOpen && <AuthModal onClose={() => openAuthModal(false)} />}
      <Toast />
    </div>
  );
}
