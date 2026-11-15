"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilmStrip } from "@/components/FilmStrip";
import { store } from "@/lib/client-store";
import type { PhotoView } from "@/lib/queries";

/** 相簿總覽的互動層：記到書架、已印格、底片攤開並捲到引導行、記住模式 */
export function AlbumClient({ code, photos, mode, justOpened, stampChar, children }: { code: string; photos: PhotoView[]; mode: "pages" | "sheet"; justOpened: boolean; stampChar: string; children: React.ReactNode }) {
  const router = useRouter();
  const [printed, setPrinted] = useState<string[]>([]);
  const [unroll, setUnroll] = useState(false);

  useEffect(() => {
    store.addToShelf(code);
    const pf = store.printed(code).map((e) => e.frame);
    setPrinted(photos.filter((p) => pf.includes(p.frameNo)).map((p) => p.id));
    // 記住的模式
    const saved = store.mode();
    const url = new URL(location.href);
    if (!url.searchParams.has("mode") && saved === "sheet") {
      url.searchParams.set("mode", "sheet");
      router.replace(url.pathname + url.search);
      return;
    }
    setUnroll(true);
    if (justOpened) {
      url.searchParams.delete("opened");
      history.replaceState(history.state, "", url.pathname + url.search);
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => document.getElementById("guide")?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" }), 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => { store.setMode(mode); }, [mode]);

  return (
    <>
      <div className="guide" id="guide">
        <p className="g">翻開了。<b>點一張你想印的。</b></p>
        <p className="n">{photos.length} 張裡挑 1 張，一人一張。</p>
      </div>
      <FilmStrip photos={photos} hrefFor={(p) => `/a/${code}/f/${p.frameNo}`} printedIds={printed} unroll={unroll} drift stampChar={stampChar} />
      {children}
    </>
  );
}

export function ModeSwitch({ code, mode }: { code: string; mode: "pages" | "sheet" }) {
  return (
    <div className="seg-q" role="radiogroup" aria-label="瀏覽模式">
      <Link href={`/a/${code}`} aria-current={mode === "pages" ? "true" : undefined} role="radio" aria-checked={mode === "pages"}>翻頁</Link>
      <Link href={`/a/${code}?mode=sheet`} aria-current={mode === "sheet" ? "true" : undefined} role="radio" aria-checked={mode === "sheet"}>印樣</Link>
    </div>
  );
}
