"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FilmStrip } from "@/components/FilmStrip";
import { store } from "@/lib/client-store";
import type { PhotoView } from "@/lib/queries";

/** 詳情：大圖、左右、全螢幕、抬起。DESIGN_SYSTEM §3.11 */
export function DetailClient({ code, photos, index }: { code: string; photos: PhotoView[]; index: number }) {
  const router = useRouter();
  const p = photos[index];
  const prev = photos.length > 1 ? photos[(index - 1 + photos.length) % photos.length] : null;
  const next = photos.length > 1 ? photos[(index + 1) % photos.length] : null;
  const href = (x: PhotoView) => `/a/${code}/f/${x.frameNo}`;
  const [printed, setPrinted] = useState<string[]>([]);
  const [printedThis, setPrintedThis] = useState<string | null>(null);
  const [lift, setLift] = useState(false);
  const [fs, setFs] = useState(false);
  const [focus, setFocus] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const list = store.printed(code);
    setPrinted(photos.filter((x) => list.some((e) => e.frame === x.frameNo)).map((x) => x.id));
    const me = list.find((e) => e.frame === p.frameNo);
    setPrintedThis(me ? me.at.slice(5, 10).replace("-", "/") : null);
  }, [code, p.frameNo, photos]);

  // 預先載入左右
  useEffect(() => {
    [prev, next].forEach((x) => { if (x) router.prefetch(href(x)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const go = (x: PhotoView | null) => { if (x) router.push(href(x)); };
  const print = () => {
    setLift(true);
    setTimeout(() => router.push(`${href(p)}/edit`), 380);
  };

  // 全螢幕：用 history state 讓返回鍵退出
  const openFs = () => {
    setFs(true);
    setFocus(false);
    history.pushState({ fs: 1 }, "");
    requestAnimationFrame(() => requestAnimationFrame(() => setFocus(true)));
    bump();
  };
  const closeFs = (pop = false) => {
    setFs(false);
    setFocus(false);
    if (!pop && history.state?.fs) history.back();
  };
  const bump = () => {
    setIdle(false);
    if (idleT.current) clearTimeout(idleT.current);
    idleT.current = setTimeout(() => setIdle(true), 1500);
  };


  // 鍵盤
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (fs) {
        if (e.key === "Escape") closeFs();
        if (e.key === "ArrowLeft") go(prev);
        if (e.key === "ArrowRight") go(next);
        return;
      }
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") go(prev);
      if (e.key === "ArrowRight") go(next);
      if (e.key === "Enter" && document.activeElement === document.body) print();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs, index]);

  // 手勢：只在觸控裝置（hover: none）上啟用，用 pointer events 處理
  const sw = useRef<{ x: number; y: number } | null>(null);
  const touchDevice = () => (typeof matchMedia !== "undefined" ? matchMedia("(hover: none), (pointer: coarse)").matches : false);
  const onPointerDown = (e: React.PointerEvent) => {
    bump();
    if (!touchDevice() && e.pointerType !== "touch") return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    sw.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!sw.current) return;
    const dx = e.clientX - sw.current.x;
    const dy = e.clientY - sw.current.y;
    sw.current = null;
    if (fs && dy > 80 && Math.abs(dx) < 60) { closeFs(); return; }
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) go(dx < 0 ? next : prev);
  };

  useEffect(() => {
    const onPop = () => { if (fs) closeFs(true); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fs]);
  return (
    <>
      <div className="detail" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div className="stage">
          {prev ? <Link className="arrow" href={href(prev)} aria-label="上一張">‹</Link> : <span />}
          <div className="big">
            <div className={`ph${lift ? " lift" : ""}`}>
              <img src={p.sizes["1440"] ?? p.src} srcSet={p.srcset} sizes="(max-width: 1023px) 100vw, 1440px" alt={p.caption || p.frameNo} width={p.width} height={p.height} fetchPriority="high" draggable={false} />
            </div>
          </div>
          {next ? <Link className="arrow" href={href(next)} aria-label="下一張">›</Link> : <span />}
        </div>
        <div className="capline">
          <span className="mono-sm">{p.frameNo}</span>
          {p.caption && <span className="cap">{p.caption}</span>}
        </div>
        <div className="actionbar fixed">
          <div className="l">
            <Link className="btn txt" href={`/a/${code}#f-${p.frameNo}`}>回到相簿</Link>
            <button className="btn txt" onClick={openFs}>全螢幕</button>
          </div>
          <div className="r">
            {printedThis && <span className="printed-note">你在 {printedThis} 印過這張。</span>}
            <button className="btn" onClick={print}>印這一張</button>
          </div>
        </div>
      </div>
      {photos.length > 1 && (
        <div className="film-fixed above-bar">
          <div className="wrap" style={{ padding: 0 }}>
            <FilmStrip thin photos={photos} hrefFor={href} currentId={p.id} printedIds={printed} ariaLabel="底片索引" />
          </div>
        </div>
      )}
      {fs && (
        <div className={`fs${focus ? " focus" : ""}${idle ? " idle" : ""}`} role="dialog" aria-modal="true" aria-label="全螢幕" onMouseMove={bump} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <img src={p.sizes["2048"] ?? p.sizes["1440"] ?? p.src} alt={p.caption || p.frameNo} draggable={false} />
          <div className="ctl">
            {prev ? <button onClick={() => go(prev)} aria-label="上一張">‹</button> : <span />}
            <span />
            {next ? <button onClick={() => go(next)} aria-label="下一張">›</button> : <span />}
          </div>
          <button className="x" onClick={() => closeFs()} aria-label="退出全螢幕">×</button>
          <span className="no mono-sm">{p.frameNo}</span>
        </div>
      )}
    </>
  );
}
