"use client";
import { useEffect, useState } from "react";
import { Proof } from "@/components/Proof";
import type { PrintSpec } from "@/lib/print-spec";
import type { PhotoView } from "@/lib/queries";

/** 蓋章 → 顯影。只在第一次進入時播放；重新整理不重播。 */
export function DoneClient({ stamp, photo, spec, paperColors }: { stamp: string; photo: PhotoView; spec: PrintSpec; paperColors: Record<string, string> | null }) {
  const [play, setPlay] = useState<boolean | null>(null);
  const [width, setWidth] = useState(220);
  useEffect(() => {
    const key = `jpr:done:${location.pathname}`;
    let seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    setPlay(!seen);
    const calc = () => setWidth(innerWidth < 640 ? 170 : 220);
    calc();
    addEventListener("resize", calc);
    return () => removeEventListener("resize", calc);
  }, []);
  const w = spec.orientation === "landscape" ? width * 1.3 : width;
  return (
    <>
      <div className={`stamp${play === null ? "" : play ? " drop" : " static"}`} aria-hidden>{stamp}</div>
      <div className="proof-wrap" style={{ margin: "var(--s5) 0" }}>
        <Proof src={photo.sizes["1440"] ?? photo.src} original={{ w: photo.width, h: photo.height }} spec={spec} width={w} paperColors={paperColors} develop={play === true} />
      </div>
    </>
  );
}
