"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  hexLuminance,
  isHexColor,
  snapRotate,
  CAPTION_SIZE,
  captionMaxSizeMm,
  SAFE_INSET,
  captionFont,
  captionInk,
  captionInkHex,
  captionPlace,
  captionPos,
  captionRotate,
  captionSizeMm,
  captionXBounds,
  captionYRange,
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
  /** CSS 寬度；省略時填滿父層。所有內部尺寸以 container query 單位計算，SSR 即正確，不會跳動。 */
  width?: number | string;
  paperColors?: Record<string, string> | null;
  showSafe?: boolean;
  showMarks?: boolean;
  interactive?: boolean;
  onCrop?: (crop: PrintSpec["crop"]) => void;
  onCropEnd?: () => void;
  develop?: boolean;
  shadow?: "default" | "sm";
  captionAnimateLast?: boolean;
  /** 一句話可拖曳（編輯器） */
  captionDraggable?: boolean;
  onCaptionMove?: (pos: { x: number; y: number }) => void;
  onCaptionMoveEnd?: () => void;
  /** 一句話縮放（字高 mm，未乘字體係數） */
  onCaptionResize?: (sizeMm: number) => void;
  /** 一句話旋轉（度） */
  onCaptionRotate?: (deg: number) => void;
  id?: string;
  className?: string;
}

/**
 * 相紙：系統的核心元件。編輯器、確認、成功、管理端訂單頁共用。
 * 幾何全部以 mm 計算，再換成 cqw（1cqw = 相紙寬度的 1%），與 lib/images/print.ts 共用同一份常數。
 */
export function Proof(p: ProofProps) {
  const paper = paperSize(p.spec.orientation);
  const area = photoArea(p.spec.orientation, p.spec.frame);
  const cq = 100 / paper.w; // 每 mm 幾 cqw
  const mm = (v: number) => `${(v * cq).toFixed(4)}cqw`;

  // 從 crop 反推顯示用的縮放與位移（以 mm 為單位，與像素無關）
  const view = useMemo(() => viewFromCrop(p.original, area, p.spec.crop), [p.original, area, p.spec.crop]);
  const coverMm = Math.max(area.w / p.original.w, area.h / p.original.h); // mm per source px
  const sMm = coverMm * view.zoom;
  const swMm = p.original.w * sMm;
  const shMm = p.original.h * sMm;
  const txMm = -(swMm - area.w) * view.ox;
  const tyMm = -(shMm - area.h) * view.oy;

  const bg = paperHex(p.spec.paper, p.paperColors);
  const ink = captionInk(p.spec.paper);
  const font = captionFont(p.spec.captionFont);
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
      const r = el.getBoundingClientRect();
      const cover = Math.max(r.width / p.original.w, r.height / p.original.h) * v.zoom;
      drag.current = { x, y, ox: v.ox, oy: v.oy, rx: Math.max(1, p.original.w * cover - r.width), ry: Math.max(1, p.original.h * cover - r.height) };
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
    // 單指拖曳走 pointer events；touch events 只處理雙指縮放
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
  }, [p.interactive, p.original.w, p.original.h, area.w, area.h]);

  const cap = p.spec.caption;
  const pos = captionPos(p.spec);
  const place = captionPlace(p.spec);
  const onPhoto = place === "photo";
  const capInk = isHexColor(p.spec.captionColor) ? p.spec.captionColor : onPhoto ? captionInkHex(p.spec.captionInk) : ink;
  const capLight = hexLuminance(capInk) > 0.4; // 淺色字配深柔影
  const capSizeMm = captionSizeMm(p.spec);
  const width = typeof p.width === "number" ? `${p.width}px` : p.width;

  /* ---- caption drag ---- */
  const handRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [capDragging, setCapDragging] = useState(false);
  const capDrag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const capResize = useRef<{ d0: number; s0: number } | null>(null);
  const capPinch = useRef<{ d0: number; s0: number } | null>(null);
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  const maxSize = captionMaxSizeMm(p.spec); // 這句話放得進紙的上限
  const baseSize = Math.max(CAPTION_SIZE.min, Math.min(maxSize, p.spec.captionSizeMm ?? CAPTION_SIZE.default));
  const sizeRef = useRef(baseSize);
  useEffect(() => {
    sizeRef.current = baseSize;
  }, [baseSize]);
  const clampSize = (v: number) => Math.max(CAPTION_SIZE.min, Math.min(maxSize, Math.round(v * 10) / 10));
  const rot = captionRotate(p.spec);
  const rotRef = useRef(rot);
  useEffect(() => {
    rotRef.current = rot;
  }, [rot]);
  const clampRot = snapRotate; // 整圈都可以；接近 0 / ±90 / 180 吸回正角
  const capRotate = useRef<{ a0: number; r0: number; cx: number; cy: number } | null>(null);
  /** 以旋轉後的外框夾在安全區內：外框半寬/半高由未旋轉的字框與角度算出 */
  const clampPos = (x: number, y: number, rotDeg = rotRef.current) => {
    const root = rootRef.current;
    const hand = handRef.current;
    const W = root?.clientWidth || 1;
    const mmPx = W / paper.w;
    const w = hand ? hand.offsetWidth : 0;
    const h = hand ? hand.offsetHeight : 0;
    const t = (Math.abs(rotDeg) * Math.PI) / 180;
    const ct = Math.abs(Math.cos(t)), st = Math.abs(Math.sin(t)); // 整圈皆可，取絕對值
    const hx = (w * ct + h * st) / 2 / mmPx; // mm
    const hy = (w * st + h * ct) / 2 / mmPx;
    // 文字框中心距基線：bottom = y - 0.38*size，中心 = bottom + h/2
    const sizeMm = captionSizeMm(p.spec);
    const centerFromBaseline = h / 2 / mmPx - sizeMm * 0.38;
    const minY = SAFE_INSET + hy - centerFromBaseline;
    const maxY = paper.h - SAFE_INSET - hy - centerFromBaseline;
    const yr = captionYRange(p.spec);
    const ny = Math.max(Math.min(yr.min, minY), Math.min(Math.max(yr.max, maxY), Math.max(minY, Math.min(maxY, y))));
    const xb = captionXBounds(p.spec); // 只看安全區，與框和放置方式無關
    const minX = xb.min + hx / paper.w;
    const maxX = xb.max - hx / paper.w;
    return { x: minX > maxX ? (xb.min + xb.max) / 2 : Math.max(minX, Math.min(maxX, x)), y: ny };
  };
  useEffect(() => {
    const el = handRef.current;
    if (!el || !p.captionDraggable) return;
    const mmPx = () => (rootRef.current?.clientWidth || 1) / paper.w;
    const center = () => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const down = (e: PointerEvent) => {
      e.stopPropagation();
      if (capPinch.current) return;
      el.setPointerCapture(e.pointerId);
      if ((e.target as HTMLElement).classList?.contains("grip")) {
        // 拖右下角的小點：以文字中心到指標的距離比例縮放
        const c = center();
        capResize.current = { d0: Math.max(8, Math.hypot(e.clientX - c.x, e.clientY - c.y)), s0: sizeRef.current };
      } else if ((e.target as HTMLElement).classList?.contains("knob")) {
        // 拖上方的把手：以文字中心為軸旋轉
        const c = center(); // 以按下時的中心為軸，拖曳期間不再重算，避免被邊界夾持推動
        capRotate.current = { a0: (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI, r0: rotRef.current, cx: c.x, cy: c.y };
        document.body.classList.add("cap-rotating");
      } else {
        capDrag.current = { x: e.clientX, y: e.clientY, px: posRef.current.x, py: posRef.current.y };
      }
      setCapDragging(true);
    };
    const move = (e: PointerEvent) => {
      if (capRotate.current) {
        const c = { x: capRotate.current.cx, y: capRotate.current.cy };
        const a = (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI;
        p.onCaptionRotate?.(clampRot(capRotate.current.r0 + (a - capRotate.current.a0)));
        return;
      }
      if (capResize.current) {
        const c = center();
        const d = Math.hypot(e.clientX - c.x, e.clientY - c.y);
        p.onCaptionResize?.(clampSize((capResize.current.s0 * d) / capResize.current.d0));
        return;
      }
      const d = capDrag.current;
      if (!d) return;
      const W = rootRef.current?.clientWidth || 1;
      p.onCaptionMove?.(clampPos(d.px + (e.clientX - d.x) / W, d.py - (e.clientY - d.y) / mmPx()));
    };
    const up = () => {
      if (!capDrag.current && !capResize.current && !capRotate.current) return;
      capDrag.current = null;
      capResize.current = null;
      capRotate.current = null;
      document.body.classList.remove("cap-rotating");
      setCapDragging(false);
      // 縮放後位置可能超出範圍，重新夾一次
      p.onCaptionMove?.(clampPos(posRef.current.x, posRef.current.y));
      p.onCaptionMoveEnd?.();
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      p.onCaptionResize?.(clampSize(sizeRef.current * (e.deltaY < 0 ? 1.05 : 0.95)));
      p.onCaptionMoveEnd?.();
    };
    // 雙指在文字上縮放
    const angleOf = (e: TouchEvent) => (Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX) * 180) / Math.PI;
    const tstart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.stopPropagation();
        capDrag.current = null;
        capPinch.current = { d0: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), s0: sizeRef.current };
        capRotate.current = { a0: angleOf(e), r0: rotRef.current, cx: 0, cy: 0 };
      }
    };
    const tmove = (e: TouchEvent) => {
      if (e.touches.length === 2 && capPinch.current) {
        e.stopPropagation();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        p.onCaptionResize?.(clampSize((capPinch.current.s0 * d) / capPinch.current.d0));
        if (capRotate.current) p.onCaptionRotate?.(clampRot(capRotate.current.r0 + (angleOf(e) - capRotate.current.a0)));
      }
    };
    const tend = () => {
      if (capPinch.current) {
        capPinch.current = null;
        capRotate.current = null;
        p.onCaptionMove?.(clampPos(posRef.current.x, posRef.current.y));
        p.onCaptionMoveEnd?.();
      }
    };
    const key = (e: KeyboardEvent) => {
      const c = posRef.current;
      const sx = e.shiftKey ? 0.05 : 0.01;
      const sy = e.shiftKey ? 2 : 0.5;
      let n: { x: number; y: number } | null = null;
      if (e.key === "ArrowLeft") n = { x: c.x - sx, y: c.y };
      else if (e.key === "ArrowRight") n = { x: c.x + sx, y: c.y };
      else if (e.key === "ArrowUp") n = { x: c.x, y: c.y + sy };
      else if (e.key === "ArrowDown") n = { x: c.x, y: c.y - sy };
      else if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        e.stopPropagation();
        p.onCaptionRotate?.(clampRot(rotRef.current + (e.key === "[" ? -2 : 2)));
        p.onCaptionMoveEnd?.();
        return;
      } else if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault();
        e.stopPropagation();
        p.onCaptionResize?.(clampSize(sizeRef.current + (e.key === "-" ? -0.2 : 0.2)));
        p.onCaptionMoveEnd?.();
        return;
      }
      if (n) {
        e.preventDefault();
        e.stopPropagation();
        p.onCaptionMove?.(clampPos(n.x, n.y));
        p.onCaptionMoveEnd?.();
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("keydown", key);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", tstart, { passive: true });
    el.addEventListener("touchmove", tmove, { passive: true });
    el.addEventListener("touchend", tend);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("keydown", key);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", tstart);
      el.removeEventListener("touchmove", tmove);
      el.removeEventListener("touchend", tend);
    };
    // 一句話的元素只在拍立得且有文字時存在，所以框與文字有無都要列入，否則換框後不會重新掛監聽
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.captionDraggable, paper.w, area.x, p.spec.frame, p.spec.orientation, p.spec.captionSizeMm, p.spec.captionFont, cap.length > 0]);
  // 旋轉或縮放後，把位置重新夾回安全區
  const rotKey = `${rot}|${baseSize}|${p.spec.captionFont}`;
  useEffect(() => {
    if (!p.captionDraggable || !cap) return;
    if (capRotate.current || capResize.current || capPinch.current) return; // 拖曳中不夾，放開時再夾
    const c = clampPos(posRef.current.x, posRef.current.y, rot);
    if (Math.abs(c.x - posRef.current.x) > 1e-4 || Math.abs(c.y - posRef.current.y) > 1e-3) p.onCaptionMove?.(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotKey]);
  return (
    <div
      ref={rootRef}
      className={`proof${p.interactive ? " interactive" : ""}${p.develop ? " develop" : ""}${p.className ? ` ${p.className}` : ""}`}
      id={p.id}
      role="img"
      aria-label={label}
      style={{ width, aspectRatio: `${paper.w} / ${paper.h}`, background: bg, boxShadow: p.shadow === "sm" ? "var(--shadow-proof-sm)" : undefined }}
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
        style={{ left: mm(area.x), top: mm(area.y), width: mm(area.w), height: mm(area.h) }}
        tabIndex={p.interactive ? 0 : undefined}
        role={p.interactive ? "application" : undefined}
        aria-label={p.interactive ? "裁切：方向鍵移動，加減縮放，0 重置" : undefined}
      >
        <img src={p.src} alt="" draggable={false} style={{ width: mm(swMm), height: mm(shMm), transform: `translate(${mm(txMm)}, ${mm(tyMm)})` }} />
      </div>
      {(p.spec.frame === "polaroid" || cap.length > 0) && (
        <div
          ref={handRef}
          className={`hand${p.captionDraggable ? " draggable" : ""}${capDragging ? " dragging" : ""}${onPhoto ? " on-photo" : ""}`}
          style={{ fontFamily: font.family, letterSpacing: font.letterSpacing, fontSize: mm(capSizeMm), bottom: mm(pos.y - capSizeMm * 0.38), left: `${(pos.x * 100).toFixed(3)}cqw`, transform: `translateX(-50%) rotate(${rot}deg)`, transformOrigin: "50% 50%", color: capInk, maxWidth: mm(area.w), textShadow: onPhoto ? `0 ${(0.16 * capSizeMm * cq).toFixed(3)}cqw ${(0.24 * capSizeMm * cq).toFixed(3)}cqw ${capLight ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.28)"}` : undefined }}
          tabIndex={p.captionDraggable && cap ? 0 : undefined}
          role={p.captionDraggable ? "application" : undefined}
          aria-label={p.captionDraggable ? "一句話：拖曳移動，方向鍵微調，加減號或滾輪縮放，中括號旋轉" : undefined}
        >
          {p.captionAnimateLast && cap.length ? (
            <>
              {cap.slice(0, -1)}
              <span className="last" key={cap}>{cap.slice(-1)}</span>
            </>
          ) : (
            cap
          )}
          {p.captionDraggable && cap.length > 0 && <i className="grip" aria-hidden />}
          {p.captionDraggable && cap.length > 0 && <i className="knob" aria-hidden />}
        </div>
      )}
      {p.showSafe && <div className="safe" />}
    </div>
  );
}
