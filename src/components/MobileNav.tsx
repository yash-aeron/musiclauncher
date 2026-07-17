import { usePlayer } from "../store/player";
import { LibraryIcon, WrappedIcon, PlaylistIcon, MusicNote } from "./Icons";
import type { ViewName } from "../types";

const TABS: { id: ViewName; label: string }[] = [
  { id: "albums", label: "Albums" },
  { id: "songs", label: "Songs" },
  { id: "playlists", label: "Playlists" },
  { id: "replay", label: "Replay" },
];

function iconFor(id: ViewName) {
  if (id === "replay") return <WrappedIcon width={20} height={20} />;
  if (id === "playlists") return <PlaylistIcon width={20} height={20} />;
  if (id === "songs") return <MusicNote width={20} height={20} />;
  return <LibraryIcon width={20} height={20} />;
}

export function MobileNav() {
  const view = usePlayer((s) => s.view);
  const setView = usePlayer((s) => s.setView);

  return (
    <nav className="chrome flex shrink-0 border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setView(tab.id)}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition active:scale-95 ${
            view === tab.id
              ? "text-[color:var(--accent-strong)]"
              : "text-white/50"
          }`}
        >
          {iconFor(tab.id)}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
