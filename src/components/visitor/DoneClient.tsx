"use client";
import { useEffect, useState } from "react";
import { Proof } from "@/components/Proof";
import { Stamp } from "@/components/Stamp";
import type { PrintSpec } from "@/lib/print-spec";
import type { PhotoView } from "@/lib/queries";

/** 蓋章 → 顯影。只在第一次進入時播放；重新整理不重播。 */
export function DoneClient({ stamp, photo, spec, paperColors }: { stamp: string; photo: PhotoView; spec: PrintSpec; paperColors: Record<string, string> | null }) {
  const [play, setPlay] = useState<boolean | null>(null);
  useEffect(() => {
    const key = `jpr:done:${location.pathname}`;
    let seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    setPlay(!seen);
  }, []);
  return (
    <>
      <div className={`stamp${play === null ? "" : play ? " drop" : " static"}`} aria-hidden>
        <Stamp char={stamp} size={64} />
      </div>
      <div className="proof-wrap" style={{ margin: "var(--s5) 0" }}>
        <Proof src={photo.sizes["1440"] ?? photo.src} original={{ w: photo.width, h: photo.height }} spec={spec} className={`slot ${spec.orientation}`} paperColors={paperColors} develop={play === true} />
      </div>
    </>
  );
}
