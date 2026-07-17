import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { LosslessBadge } from "./LosslessBadge";
import { groupAlbums, bestTierTrack } from "../lib/albums";
import type { Track } from "../types";

export function LibraryGrid({ tracks }: { tracks: Track[] }) {
  const albums = useMemo(() => groupAlbums(tracks), [tracks]);
  const openAlbum = usePlayer((s) => s.openAlbum);
  const reduce = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {albums.map((a, i) => {
        const best = bestTierTrack(a.tracks);
        return (
          <motion.button
            key={a.key}
            onClick={() => openAlbum(a.key)}
            className="group text-left"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.35), ease: [0.16, 1, 0.3, 1] }}
          >
            <AlbumArt
              url={a.artUrl}
              alt={a.title}
              rounded="rounded-md"
              className="aspect-square w-full shadow-md shadow-black/40 ring-1 ring-white/10 transition group-hover:brightness-110"
            />
            <div className="mt-2 flex items-center gap-1.5">
              <div className="truncate text-[13px] font-medium leading-tight">{a.title}</div>
              {best ? <LosslessBadge track={best} /> : null}
            </div>
            <div className="truncate text-[12px] leading-tight text-white/50">{a.artist}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
