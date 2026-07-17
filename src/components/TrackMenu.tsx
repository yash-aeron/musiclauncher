import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../store/player";
import { MoreIcon, Play, QueueIcon, PlaylistIcon, Pencil, TrashIcon } from "./Icons";
import type { Track } from "../types";

/** "⋯" menu on each row: Play Next / Add to Queue / Add to Playlist / Edit. */
export function TrackMenu({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const playTrackNext = usePlayer((s) => s.playTrackNext);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const openAddToPlaylist = usePlayer((s) => s.openAddToPlaylist);
  const openEditTrack = usePlayer((s) => s.openEditTrack);
  const deleteTracks = usePlayer((s) => s.deleteTracks);
  const setToast = usePlayer((s) => s.setToast);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const items = [
    {
      label: "Play Next",
      icon: <Play width={15} height={15} />,
      run: () => {
        playTrackNext(track);
        setToast(`Playing “${track.title}” next.`);
      },
    },
    {
      label: "Add to Queue",
      icon: <QueueIcon width={15} height={15} />,
      run: () => {
        addToQueue(track);
        setToast(`Added “${track.title}” to queue.`);
      },
    },
    {
      label: "Add to Playlist",
      icon: <PlaylistIcon width={15} height={15} />,
      run: () => openAddToPlaylist(track.id),
    },
    {
      label: "Edit Song",
      icon: <Pencil width={15} height={15} />,
      run: () => openEditTrack(track.id),
    },
    {
      label: "Remove from Library",
      icon: <TrashIcon width={15} height={15} />,
      run: () => {
        if (confirm(`Remove “${track.title}” from your library?`)) {
          deleteTracks([track.id]);
          setToast(`Removed “${track.title}”.`);
        }
      },
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full p-2 transition hover:bg-white/10 hover:text-white ${
          open ? "text-white" : "text-white/40 sm:opacity-0 sm:group-hover:opacity-100"
        }`}
        title="More"
      >
        <MoreIcon width={16} height={16} />
      </button>
      {open ? (
        <div className="glass-strong absolute right-0 top-10 z-40 w-48 rounded-xl p-1.5 shadow-2xl">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.run();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              <span className="text-white/50">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
