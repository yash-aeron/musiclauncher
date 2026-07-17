import { MusicNote } from "./Icons";

export function AlbumArt({
  url,
  alt,
  className = "",
  rounded = "rounded-xl",
}: {
  url?: string;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${rounded} bg-white/5 ${className}`}
    >
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/25">
          <MusicNote width="40%" height="40%" />
        </div>
      )}
    </div>
  );
}
