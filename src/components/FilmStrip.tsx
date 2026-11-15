"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { PhotoView } from "@/lib/queries";
import { Stamp } from "@/components/Stamp";

export interface FilmStripProps {
  photos: PhotoView[];
  hrefFor: (p: PhotoView) => string;
  currentId?: string | null;
  printedIds?: string[];
  thin?: boolean;
  unroll?: boolean;
  /** 緩慢自動捲動，像底片從捲軸拉出；一碰就停。只在溢出時生效，尊重減少動態。 */
  drift?: boolean;
  ariaLabel?: string;
  id?: string;
  /** 已印過的格在角落蓋一個小印；傳印章字 */
  stampChar?: string;
}

/** 底片：空間索引。每一格保留照片原比例，格高固定、格寬隨比例。DESIGN_SYSTEM §3.7 */
export function FilmStrip({ photos, hrefFor, currentId, printedIds = [], thin, unroll, drift, ariaLabel = "底片", id, stampChar = "印" }: FilmStripProps) {
  const track = useRef<HTMLDivElement>(null);
  const stopped = useRef(false);

  // 只橫向捲動到目前格；不用 scrollIntoView，以免整頁跟著往下捲
  useEffect(() => {
    const el = track.current;
    const cur = el?.querySelector<HTMLElement>(".fr.cur");
    if (!el || !cur) return;
    el.scrollLeft = Math.max(0, cur.offsetLeft - el.clientWidth / 2 + cur.offsetWidth / 2);
  }, [currentId]);

  // 自動拉出
  useEffect(() => {
    const el = track.current;
    if (!el || !drift) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.dataset.drift = "reduced"; return; }
    if (el.scrollWidth <= el.clientWidth + 8) { el.dataset.drift = "fits"; return; }
    el.dataset.drift = "armed";
    let raf = 0;
    let last = 0;
    let paused = false;
    let pos = el.scrollLeft; // 以浮點累積，scrollLeft 本身會取整
    let expected = Math.round(pos);
    const SPEED = 28; // px/s
    const step = (t: number) => {
      if (stopped.current) return;
      if (!last) last = t;
      const dt = Math.min(64, t - last);
      last = t;
      if (!paused) {
        pos += (SPEED * dt) / 1000;
        expected = Math.round(pos);
        el.scrollLeft = expected;
        el.dataset.drift = "running";
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) { el.style.scrollSnapType = ""; el.dataset.drift = "end"; return; } // 到尾就停
      }
      raf = requestAnimationFrame(step);
    };
    const stop = (why = "user") => { stopped.current = true; cancelAnimationFrame(raf); el.style.scrollSnapType = ""; el.dataset.drift = `stopped:${why}`; };
    // scroll 事件在下一個 frame 才來，所以用「和預期位置差多少」判斷是不是使用者自己捲的
    const onScroll = () => { if (Math.abs(el.scrollLeft - expected) > 3) stop(`scroll:${el.scrollLeft}/${expected}`); };
    const pause = () => { paused = true; };
    const resume = () => { paused = false; last = 0; };
    // 進場動畫期間 scroll-snap 會自己微捲幾 px，所以 scroll 監聽等開始拉出時才掛，並以當下位置為基準
    const timer = setTimeout(() => {
      pos = el.scrollLeft;
      expected = Math.round(pos);
      el.style.scrollSnapType = "none"; // 拉出時關掉吸附，否則每走幾 px 就被吸到下一格
      el.addEventListener("scroll", onScroll, { passive: true });
      raf = requestAnimationFrame(step);
    }, 900);
    const stopUser = () => stop("user");
    el.addEventListener("pointerdown", stopUser);
    el.addEventListener("touchstart", stopUser, { passive: true });
    el.addEventListener("wheel", stopUser, { passive: true });
    el.addEventListener("keydown", stopUser);
    el.addEventListener("focusin", () => stop("focus"));
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      el.style.scrollSnapType = "";
      el.removeEventListener("pointerdown", stopUser);
      el.removeEventListener("touchstart", stopUser);
      el.removeEventListener("wheel", stopUser);
      el.removeEventListener("keydown", stopUser);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
    };
  }, [drift, photos.length]);

  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(track.current?.querySelectorAll<HTMLElement>(".fr") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
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
        {photos.map((p, i) => {
          const sel = printedIds.includes(p.id);
          const cur = p.id === currentId;
          const ar = `${p.width} / ${p.height}`;
          const inner = (
            <>
              <div className="ph" style={{ aspectRatio: ar }}>
                <img src={p.sizes["480"] ?? p.src} alt="" loading="eager" decoding="async" width={p.width} height={p.height} />
                {sel && <span className="chop" title="已印過"><Stamp char={stampChar} size={thin ? 16 : 22} blend={false} /></span>}
              </div>
              <span>
                <em>{p.frameNo}</em>
                <em className="ratio">{p.portrait ? "2:3" : "3:2"}</em>
              </span>
            </>
          );
          const cls = `fr${cur ? " cur" : ""}${sel ? " printed" : ""}${p.portrait ? " narrow" : ""}`;
          const style = { "--i": i } as React.CSSProperties;
          // 目前格不是連結：點它不會有事，游標也不會變成手
          return cur ? (
            <div key={p.id} className={cls} role="option" aria-selected={sel} aria-current="true" aria-label={`${p.frameNo} ${p.caption || ""}（目前）`.trim()} style={style} tabIndex={0}>
              {inner}
            </div>
          ) : (
            <Link key={p.id} href={hrefFor(p)} className={cls} role="option" aria-selected={sel} aria-label={`${p.frameNo} ${p.caption || ""}`.trim()} style={style}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
