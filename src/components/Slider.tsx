import { useCallback, useRef } from "react";

/** Minimal accessible click/drag slider used for seek + volume. */
export function Slider({
  value,
  max,
  onChange,
  onCommit,
  className = "",
  accent = "bg-white",
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  className?: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const posToValue = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * max;
    },
    [max],
  );

  function onPointerDown(e: React.PointerEvent) {
    // Don't let a scrub gesture start dragging an enclosing sheet
    // (e.g. the swipe-to-dismiss Now Playing screen).
    e.stopPropagation();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onChange(posToValue(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragging.current) onChange(posToValue(e.clientX));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragging.current) {
      dragging.current = false;
      onCommit?.(posToValue(e.clientX));
    }
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`group relative flex cursor-pointer items-center py-2 ${className}`}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
