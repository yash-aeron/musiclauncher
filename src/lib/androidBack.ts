import { usePlayer } from "../store/player";

/**
 * Android hardware/gesture back handling.
 *
 * In the Tauri Android WebView the system back button maps to browser history
 * navigation, and with a single-page app there's no history to pop — so back
 * closes the whole app. We fix that by keeping one "sentinel" history entry
 * armed: when back fires (popstate) we close the topmost open overlay/view and
 * re-arm the sentinel, staying in the app. Only when nothing is open do we let
 * the navigation through, which exits the app.
 *
 * Returns a cleanup function.
 */
export function setupAndroidBack(): () => void {
  if (typeof window === "undefined") return () => {};

  const arm = () => history.pushState({ ml: true }, "");
  arm();

  // Try to close the topmost UI layer. Returns true if something was closed.
  const closeTop = (): boolean => {
    const s = usePlayer.getState();
    if (s.authModalOpen) return s.openAuthModal(false), true;
    if (s.addToPlaylistTrackId) return s.openAddToPlaylist(null), true;
    if (s.editingTrackId) return s.openEditTrack(null), true;
    if (s.queueOpen) return s.openQueue(false), true;
    if (s.nowPlayingOpen) return s.openNowPlaying(false), true;
    if (s.selectedAlbumKey) return s.openAlbum(null), true;
    if (s.selectedPlaylistId) return s.openPlaylist(null), true;
    // Any non-default view returns to the library instead of exiting.
    if (s.view !== "albums") return s.setView("albums"), true;
    return false;
  };

  const onPop = () => {
    if (closeTop()) {
      arm(); // re-arm so the next back is captured too
      return;
    }
    // Nothing to close — the user wants to leave. The popstate that got us here
    // already consumed the sentinel, so we're on the app's base history entry
    // where history.back() can silently no-op (Tauri cold launch). Close the
    // native window directly for a reliable single-press exit; re-arm as a
    // fallback so we're never stranded without a sentinel if the close fails.
    arm();
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
      } catch {
        history.go(-2); // fallback: pop the re-armed sentinel + base entry
      }
    })();
  };

  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}
