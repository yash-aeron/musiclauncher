import { useMemo } from "react";
import { usePlayer } from "../store/player";
import { AlbumArt } from "./AlbumArt";
import { groupAlbums } from "../lib/albums";
import type { Album, Track } from "../types";

export function ArtistsView({ tracks }: { tracks: Track[] }) {
  const openAlbum = usePlayer((s) => s.openAlbum);

  const byArtist = useMemo(() => {
    const map = new Map<string, Album[]>();
    for (const a of groupAlbums(tracks)) {
      const list = map.get(a.artist) ?? [];
      list.push(a);
      map.set(a.artist, list);
    }
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [tracks]);

  return (
    <div className="flex flex-col gap-8">
      {byArtist.map(([artist, albums]) => (
        <section key={artist}>
          <h3 className="mb-3 text-lg font-bold tracking-tight">{artist}</h3>
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {albums.map((a) => (
              <button key={a.key} onClick={() => openAlbum(a.key)} className="group text-left">
                <AlbumArt
                  url={a.artUrl}
                  alt={a.title}
                  rounded="rounded-md"
                  className="aspect-square w-full shadow-md shadow-black/40 ring-1 ring-white/10 transition group-hover:brightness-110"
                />
                <div className="mt-2 truncate text-[13px] font-medium leading-tight">{a.title}</div>
                <div className="truncate text-[12px] text-white/45">{a.year ?? ""}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
