import { usePlayer } from "../store/player";
import { LibraryIcon, WrappedIcon, MusicNote, PlaylistIcon, SearchIcon } from "./Icons";
import type { ViewName } from "../types";

const LIBRARY: { id: ViewName; label: string }[] = [
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "songs", label: "Songs" },
  { id: "playlists", label: "Playlists" },
];

export function Sidebar() {
  const view = usePlayer((s) => s.view);
  const setView = usePlayer((s) => s.setView);

  return (
    <nav className="chrome hidden h-full w-56 shrink-0 flex-col gap-5 overflow-y-auto border-r border-white/10 px-3 py-4 md:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="text-[color:var(--accent)]">
          <MusicNote width={20} height={20} />
        </span>
        <h1 className="text-[15px] font-bold tracking-tight">Music</h1>
      </div>

      <Section title="Online">
        <Item
          label="Search"
          active={view === "search"}
          onClick={() => setView("search")}
          icon={<SearchIcon width={16} height={16} />}
        />
      </Section>

      <Section title="Library">
        {LIBRARY.map((item) => (
          <Item
            key={item.id}
            label={item.label}
            active={view === item.id}
            onClick={() => setView(item.id)}
            icon={
              item.id === "playlists" ? (
                <PlaylistIcon width={16} height={16} />
              ) : (
                <LibraryIcon width={16} height={16} />
              )
            }
          />
        ))}
      </Section>

      <Section title="Made for You">
        <Item
          label="Replay"
          active={view === "replay"}
          onClick={() => setView("replay")}
          icon={<WrappedIcon width={16} height={16} />}
        />
      </Section>

    </nav>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/35">
        {title}
      </div>
      {children}
    </div>
  );
}

function Item({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition ${
        active
          ? "bg-white/12 text-white"
          : "text-white/70 hover:bg-white/6 hover:text-white"
      }`}
    >
      <span className={active ? "text-[color:var(--accent)]" : "text-white/45"}>{icon}</span>
      {label}
    </button>
  );
}
