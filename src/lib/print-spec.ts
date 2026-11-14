/**
 * Print Spec — DESIGN_SYSTEM.md §2
 * 前端相紙預覽與後端列印檔共用這一份常數。單位：毫米，除非另有標示。
 */

export const PAPER = { w: 100, h: 148 } as const; // Canon SELPHY 明信片相紙
export const OUTPUT_PX = { w: 1200, h: 1800 } as const; // 4×6 in @ 300 dpi，直式
export const PX_PER_MM = OUTPUT_PX.w / PAPER.w; // 12
export const BLEED_DEFAULT = { top: 3, right: 3, bottom: 3, left: 3 } as const;
export const SAFE_INSET = 8; // 文字與重要內容離紙邊的最小距離

export type FrameStyle = "none" | "thin" | "polaroid";
export type Orientation = "portrait" | "landscape";
export type Tone = "color" | "bw";
export type Finish = "glossy" | "matte";
export type PaperKey = "white" | "cream" | "black" | "sage" | "tea";

export const FRAME: Record<FrameStyle, { top: number; right: number; bottom: number; left: number }> = {
  none: { top: 0, right: 0, bottom: 0, left: 0 },
  thin: { top: 6, right: 6, bottom: 6, left: 6 },
  polaroid: { top: 6, right: 6, bottom: 22, left: 6 },
};

export const CAPTION = { fontSizeMm: 3.2, baselineFromBottomMm: 9, maxChars: 30 } as const;

/** 裁切後有效像素門檻（短邊, 長邊） */
export const MIN_PX = { ok: [1200, 1800], warn: [800, 1200] } as const;

export const PAPER_COLORS: { key: PaperKey; hex: string; name: string }[] = [
  { key: "white", hex: "#FFFFFF", name: "白" },
  { key: "cream", hex: "#F3ECDD", name: "米白" },
  { key: "black", hex: "#2A2724", name: "黑" },
  { key: "sage", hex: "#8A9A7B", name: "灰綠" },
  { key: "tea", hex: "#C9A68A", name: "淺茶" },
];

export const CAPTION_INK = { onLight: "#3A362F", onDark: "#EFE8DC" } as const;

export const FRAME_NAME: Record<FrameStyle, string> = { none: "無", thin: "細框", polaroid: "拍立得" };
export const FINISH_NAME: Record<Finish, string> = { glossy: "光面", matte: "霧面" };
export const TONE_NAME: Record<Tone, string> = { color: "彩色", bw: "黑白" };
export const ORIENTATION_NAME: Record<Orientation, string> = { portrait: "直式", landscape: "橫式" };

/** 一份可重算的列印描述。crop 是相對於「已套用 Exif 方向」的原圖的 0–1 座標。 */
export interface PrintSpec {
  orientation: Orientation;
  crop: { x: number; y: number; w: number; h: number };
  tone: Tone;
  frame: FrameStyle;
  paper: PaperKey;
  caption: string;
  finish: Finish;
}

/** 相紙在目前方向下的尺寸（mm） */
export function paperSize(orientation: Orientation) {
  return orientation === "landscape" ? { w: PAPER.h, h: PAPER.w } : { w: PAPER.w, h: PAPER.h };
}

/** 照片區域在相紙上的位置與尺寸（mm）。拍立得的寬帶永遠在下方。 */
export function photoArea(orientation: Orientation, frame: FrameStyle) {
  const p = paperSize(orientation);
  const f = FRAME[frame];
  return { x: f.left, y: f.top, w: p.w - f.left - f.right, h: p.h - f.top - f.bottom };
}

/** 輸出檔像素尺寸 */
export function outputSize(orientation: Orientation) {
  return orientation === "landscape" ? { w: OUTPUT_PX.h, h: OUTPUT_PX.w } : { w: OUTPUT_PX.w, h: OUTPUT_PX.h };
}

/** 給定原圖像素與裁切，算出裁切後對應的有效像素 */
export function effectivePixels(spec: PrintSpec, original: { w: number; h: number }) {
  return {
    w: Math.round(spec.crop.w * original.w),
    h: Math.round(spec.crop.h * original.h),
  };
}

export type ResolutionLevel = "ok" | "warn" | "block";

export function resolutionLevel(spec: PrintSpec, original: { w: number; h: number }): ResolutionLevel {
  const e = effectivePixels(spec, original);
  const short = Math.min(e.w, e.h);
  const long = Math.max(e.w, e.h);
  if (short >= MIN_PX.ok[0] && long >= MIN_PX.ok[1]) return "ok";
  if (short >= MIN_PX.warn[0] && long >= MIN_PX.warn[1]) return "warn";
  return "block";
}

/**
 * 以「填滿」為基準的裁切：zoom ≥ 1、ox/oy 0–1 表示可移動範圍內的位置。
 * 編輯器用這組參數操作，存檔時轉成 crop。
 */
export function cropFromView(
  original: { w: number; h: number },
  area: { w: number; h: number },
  view: { zoom: number; ox: number; oy: number },
) {
  const cover = Math.max(area.w / original.w, area.h / original.h);
  const s = cover * view.zoom;
  const visW = area.w / s / original.w;
  const visH = area.h / s / original.h;
  const x = (1 - visW) * clamp01(view.ox);
  const y = (1 - visH) * clamp01(view.oy);
  return { x, y, w: Math.min(1, visW), h: Math.min(1, visH) };
}

export function viewFromCrop(
  original: { w: number; h: number },
  area: { w: number; h: number },
  crop: { x: number; y: number; w: number; h: number },
) {
  const cover = Math.max(area.w / original.w, area.h / original.h);
  const s = area.w / (crop.w * original.w);
  const zoom = Math.max(1, s / cover);
  const ox = crop.w >= 1 ? 0.5 : crop.x / (1 - crop.w);
  const oy = crop.h >= 1 ? 0.5 : crop.y / (1 - crop.h);
  return { zoom, ox: clamp01(ox), oy: clamp01(oy) };
}

export function defaultSpec(original: { w: number; h: number }): PrintSpec {
  const orientation: Orientation = original.h > original.w ? "portrait" : "landscape";
  const area = photoArea(orientation, "polaroid");
  return {
    orientation,
    crop: cropFromView(original, area, { zoom: 1, ox: 0.5, oy: 0.5 }),
    tone: "color",
    frame: "polaroid",
    paper: "white",
    caption: "",
    finish: "glossy",
  };
}

/** 改方向或改框時，保持中心點與相對縮放重算裁切 */
export function recropForArea(
  original: { w: number; h: number },
  prev: PrintSpec["crop"],
  orientation: Orientation,
  frame: FrameStyle,
) {
  const area = photoArea(orientation, frame);
  const cover = Math.max(area.w / original.w, area.h / original.h);
  // 保持原本的「可見寬度比例」盡量不變
  const prevScale = area.w / (prev.w * original.w);
  const zoom = Math.max(1, Math.min(3, prevScale / cover));
  const cx = prev.x + prev.w / 2;
  const cy = prev.y + prev.h / 2;
  const s = cover * zoom;
  const visW = Math.min(1, area.w / s / original.w);
  const visH = Math.min(1, area.h / s / original.h);
  const ox = visW >= 1 ? 0.5 : clamp01((cx - visW / 2) / (1 - visW));
  const oy = visH >= 1 ? 0.5 : clamp01((cy - visH / 2) / (1 - visH));
  return cropFromView(original, area, { zoom, ox, oy });
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function paperHex(key: PaperKey, custom?: Record<string, string> | null) {
  return custom?.[key] ?? PAPER_COLORS.find((p) => p.key === key)?.hex ?? "#FFFFFF";
}

export function captionInk(key: PaperKey) {
  return key === "black" ? CAPTION_INK.onDark : CAPTION_INK.onLight;
}
