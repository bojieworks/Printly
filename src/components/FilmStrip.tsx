"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PhotoView } from "@/lib/queries";

export interface FilmStripProps {
  photos: PhotoView[];
  hrefFor: (p: PhotoView) => string;
  currentId?: string | null;
  printedIds?: string[];
  thin?: boolean;
  unroll?: boolean;
  ariaLabel?: string;
  id?: string;
}

/** 底片：空間索引。DESIGN_SYSTEM §3.7 */
export function FilmStrip({ photos, hrefFor, currentId, printedIds = [], thin, unroll, ariaLabel = "底片", id }: FilmStripProps) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cur = track.current?.querySelector<HTMLElement>(".fr.cur");
    cur?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" as ScrollBehavior });
  }, [currentId]);
  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(track.current?.querySelectorAll<HTMLAnchorElement>(".fr") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    if (e.key === "ArrowRight") { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); items[Math.max(0, i - 1)]?.focus(); }
    if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
  };
  if (!photos.length) return null;
  return (
    <div className={`film${thin ? " thin" : ""}${unroll ? " unroll" : ""}`} id={id}>
      <div className="track" role="listbox" aria-label={ariaLabel} ref={track} onKeyDown={onKey}>
        {photos.map((p) => {
          const sel = printedIds.includes(p.id);
          const cur = p.id === currentId;
          return (
            <Link
              key={p.id}
              href={hrefFor(p)}
              className={`fr${cur ? " cur" : ""}${sel ? " sel" : ""}`}
              role="option"
              aria-selected={sel}
              aria-current={cur ? "true" : undefined}
              aria-label={`${p.frameNo} ${p.caption || ""}`.trim()}
            >
              <div className="ph">
                <img src={p.sizes["480"] ?? p.src} alt="" loading="lazy" style={{ objectPosition: `${p.focalX}% ${p.focalY}%` }} />
              </div>
              <span>
                <em>{p.frameNo}</em>
                <em>{p.portrait ? "2:3" : "3:2"}</em>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
