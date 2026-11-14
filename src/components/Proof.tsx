"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAPTION,
  captionInk,
  paperHex,
  paperSize,
  photoArea,
  cropFromView,
  viewFromCrop,
  type PrintSpec,
} from "@/lib/print-spec";

export interface ProofProps {
  src: string;
  original: { w: number; h: number };
  spec: PrintSpec;
  width: number; // css px
  paperColors?: Record<string, string> | null;
  showSafe?: boolean;
  showMarks?: boolean;
  interactive?: boolean;
  onCrop?: (crop: PrintSpec["crop"]) => void;
  onCropEnd?: () => void;
  develop?: boolean;
  shadow?: "default" | "sm";
  /** 一句話逐字出現時標記最後一字 */
  captionAnimateLast?: boolean;
  id?: string;
}

/**
 * 相紙：系統的核心元件。編輯器、確認、成功、管理端訂單頁共用。
 * 幾何全部以 mm 計算再換成 px；與 lib/images/print.ts 使用同一份常數。
 */
export function Proof(p: ProofProps) {
  const paper = paperSize(p.spec.orientation);
  const area = photoArea(p.spec.orientation, p.spec.frame);
  const mm = p.width / paper.w;
  const W = p.width;
  const H = W * (paper.h / paper.w);
  const areaPx = { left: area.x * mm, top: area.y * mm, width: area.w * mm, height: area.h * mm };

  // 從 crop 反推顯示用的縮放與位移
  const view = useMemo(() => viewFromCrop(p.original, area, p.spec.crop), [p.original, area, p.spec.crop]);
  const cover = Math.max(areaPx.width / p.original.w, areaPx.height / p.original.h);
  const s = cover * view.zoom;
  const sw = p.original.w * s;
  const sh = p.original.h * s;
  const tx = -(sw - areaPx.width) * view.ox;
  const ty = -(sh - areaPx.height) * view.oy;

  const bg = paperHex(p.spec.paper, p.paperColors);
  const ink = captionInk(p.spec.paper);
  const label = `${p.spec.frame === "none" ? "無框" : p.spec.frame === "thin" ? "細框" : "拍立得"}，${p.spec.orientation === "portrait" ? "直式" : "橫式"}，${p.spec.tone === "bw" ? "黑白" : "彩色"}${p.spec.caption ? `，一句話：${p.spec.caption}` : ""}`;

  /* ---- interaction ---- */
  const areaRef = useRef<HTMLDivElement>(null);
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; rx: number; ry: number } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const emit = (v: { zoom: number; ox: number; oy: number }) => {
    const z = Math.max(1, Math.min(3, v.zoom));
    p.onCrop?.(cropFromView(p.original, area, { zoom: z, ox: v.ox, oy: v.oy }));
  };
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  useEffect(() => {
    const el = areaRef.current;
    if (!el || !p.interactive) return;
    const start = (x: number, y: number) => {
      const v = viewRef.current;
      const cover2 = Math.max(areaPx.width / p.original.w, areaPx.height / p.original.h) * v.zoom;
      drag.current = { x, y, ox: v.ox, oy: v.oy, rx: Math.max(1, p.original.w * cover2 - areaPx.width), ry: Math.max(1, p.original.h * cover2 - areaPx.height) };
      setGrabbing(true);
    };
    const move = (x: number, y: number) => {
      const d = drag.current;
      if (!d) return;
      emit({ zoom: viewRef.current.zoom, ox: clamp(d.ox - (x - d.x) / d.rx), oy: clamp(d.oy - (y - d.y) / d.ry) });
    };
    const end = () => {
      if (drag.current || pinch.current) {
        drag.current = null;
        pinch.current = null;
        setGrabbing(false);
        p.onCropEnd?.();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (pinch.current) return;
      el.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pinch.current) return;
      move(e.clientX, e.clientY);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      emit({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.06 : 0.94) });
      p.onCropEnd?.();
    };
    const onDbl = () => {
      emit({ zoom: 1, ox: 0.5, oy: 0.5 });
      p.onCropEnd?.();
    };
    // 單指拖曳走 pointer events（滑鼠、觸控、筆都一樣）；touch events 只處理雙指縮放
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        drag.current = null;
        setGrabbing(false);
        pinch.current = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), z: viewRef.current.zoom };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        emit({ ...viewRef.current, zoom: (pinch.current.z * d) / pinch.current.d });
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const v = viewRef.current;
      const st = e.shiftKey ? 0.05 : 0.01;
      let handled = true;
      if (e.key === "ArrowLeft") emit({ ...v, ox: clamp(v.ox - st) });
      else if (e.key === "ArrowRight") emit({ ...v, ox: clamp(v.ox + st) });
      else if (e.key === "ArrowUp") emit({ ...v, oy: clamp(v.oy - st) });
      else if (e.key === "ArrowDown") emit({ ...v, oy: clamp(v.oy + st) });
      else if (e.key === "+" || e.key === "=") emit({ ...v, zoom: v.zoom * 1.06 });
      else if (e.key === "-") emit({ ...v, zoom: v.zoom / 1.06 });
      else if (e.key === "0") emit({ zoom: 1, ox: 0.5, oy: 0.5 });
      else handled = false;
      if (handled) {
        e.preventDefault();
        p.onCropEnd?.();
      }
    };
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDbl);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", end);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDbl);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", end);
      el.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.interactive, areaPx.width, areaPx.height, p.original.w, p.original.h, area.w, area.h]);

  const cap = p.spec.caption;
  return (
    <div
      className={`proof${p.interactive ? " interactive" : ""}${p.develop ? " develop" : ""}`}
      id={p.id}
      role="img"
      aria-label={label}
      style={{ width: W, height: H, background: bg, boxShadow: p.shadow === "sm" ? "var(--shadow-proof-sm)" : undefined }}
    >
      {p.showMarks && (
        <>
          <i className="mk tl" /><i className="mk tr" /><i className="mk bl" /><i className="mk br" />
          <span className="dim w">{paper.w} mm</span>
          <span className="dim h">{paper.h} mm</span>
        </>
      )}
      <div
        ref={areaRef}
        className={`area${p.spec.tone === "bw" ? " bw" : ""}${p.interactive ? (grabbing ? " grabbing" : " grab") : ""}`}
        style={{ left: areaPx.left, top: areaPx.top, width: areaPx.width, height: areaPx.height }}
        tabIndex={p.interactive ? 0 : undefined}
        role={p.interactive ? "application" : undefined}
        aria-label={p.interactive ? "裁切：方向鍵移動，加減縮放，0 重置" : undefined}
      >
        <img src={p.src} alt="" draggable={false} style={{ width: sw, height: sh, transform: `translate(${tx}px, ${ty}px)` }} />
      </div>
      {p.spec.frame === "polaroid" && (
        <div
          className="hand"
          style={{ fontSize: CAPTION.fontSizeMm * mm, bottom: (CAPTION.baselineFromBottomMm - 1.2) * mm, color: ink, padding: `0 ${area.x * mm}px` }}
        >
          {p.captionAnimateLast && cap.length ? (
            <>
              {cap.slice(0, -1)}
              <span className="last" key={cap}>{cap.slice(-1)}</span>
            </>
          ) : (
            cap
          )}
        </div>
      )}
      {p.showSafe && <div className="safe" />}
    </div>
  );
}
