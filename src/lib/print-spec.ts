/**
 * Print Spec — DESIGN_SYSTEM.md §2
 * 前端相紙預覽與後端列印檔共用這一份常數。單位：毫米，除非另有標示。
 */

export const PAPER = { w: 100, h: 148 } as const; // Canon SELPHY 明信片相紙
/** 輸出比例固定 12 px/mm（300 dpi），長寬同一個比例，幾何才會與相紙一致：1200 × 1776（直式） */
export const PX_PER_MM = 12;
export const OUTPUT_PX = { w: PAPER.w * PX_PER_MM, h: PAPER.h * PX_PER_MM } as const; // 1200 × 1776
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
/** 一句話的位置：x 為文字中心在相紙寬度上的比例（0–1），y 為基線距紙底的 mm。可在下帶內自由移動。 */
export interface CaptionPos { x: number; y: number }
export const CAPTION_POS_DEFAULT: CaptionPos = { x: 0.5, y: CAPTION.baselineFromBottomMm };
export const CAPTION_Y_RANGE = { min: 4.5, max: 19 } as const; // 下帶 22 mm 內，上緣留 3 mm
/** 文字放在照片上時：墨色依底下亮度自動選 */
export type CaptionPlace = "band" | "photo";
export type CaptionInk = "light" | "dark";
export const CAPTION_ON_PHOTO = { light: "#F4F1EA", dark: "#2A2724", lumThreshold: 0.55 } as const;
/** 一句話的字高（mm）：連續值，預設 3.2，可在相紙上直接縮放 */
export type CaptionSize = "s" | "m" | "l"; // 舊欄位，相容用
export const CAPTION_SIZE = { min: 2, max: 14, default: 3.2 } as const;
/** 旋轉：整圈都可以，角度正規化到 (-180, 180]；接近 0 / ±90 / 180 的 ±3° 吸回正角 */
export const CAPTION_ROTATE = { min: -180, max: 180, snap: 3 } as const;
export const normalizeRotate = (v: number) => {
  const r = ((((v + 180) % 360) + 360) % 360) - 180; // (-180, 180]
  return r === -180 ? 180 : r;
};
export const captionRotate = (spec: Pick<PrintSpec, "captionRotate">) => normalizeRotate(Math.round(spec.captionRotate ?? 0));
/** 四個正角附近吸附 */
export const snapRotate = (v: number) => {
  const r = normalizeRotate(Math.round(v));
  for (const t of [0, 90, -90, 180]) if (Math.abs(r - t) <= CAPTION_ROTATE.snap) return t;
  if (Math.abs(r + 180) <= CAPTION_ROTATE.snap) return 180;
  return r;
};
/** 一句話的顏色：留空為自動（下帶用紙色對應的墨，照片上依底色亮度選淺或深） */
export const CAPTION_COLORS = [
  { key: "ink", name: "墨黑", hex: "#2A2724" },
  { key: "paper", name: "紙白", hex: "#F4F1EA" },
  { key: "pencil", name: "鉛筆灰", hex: "#7D776C" },
  { key: "vermilion", name: "朱砂", hex: "#C4302B" },
  { key: "amber", name: "琥珀", hex: "#E3A04F" },
  { key: "indigo", name: "藍墨", hex: "#2E4A6B" },
  { key: "moss", name: "墨綠", hex: "#3F5A47" },
] as const;
export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
/** 相對亮度 0–1（sRGB 近似），用來決定柔影要用深或淺 */
export function hexLuminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [16, 8, 0].map((sh) => ((n >> sh) & 255) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const captionColorName = (hex: string) => CAPTION_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase();
const LEGACY_SIZE: Record<CaptionSize, number> = { s: 2.6, m: 3.2, l: 4.2 };
/** 文字框相對基線的上下延伸（以字高為單位），依實測取整個字框都留在安全區內 */
export const CAPTION_ASCENT = 1.1;
export const CAPTION_DESCENT = 0.4;

/** 一句話可選的字體。web 用 Google Fonts，列印用 assets/fonts 內的同名字體檔。 */
export type CaptionFont = "hand" | "serif" | "sans" | "mono";
export const CAPTION_FONTS: { key: CaptionFont; name: string; hint: string; family: string; file: string; sizeMul: number; letterSpacing: string }[] = [
  { key: "hand", name: "手寫", hint: "像在拍立得下面寫字", family: "'LXGW WenKai TC', 'Kaiti TC', serif", file: "LXGWWenKaiTC-Regular.ttf", sizeMul: 1, letterSpacing: "0" },
  { key: "serif", name: "宋體", hint: "像攝影集的圖說", family: "'Noto Serif TC', 'Songti TC', serif", file: "NotoSerifTC-Regular.otf", sizeMul: 0.92, letterSpacing: "0.04em" },
  { key: "sans", name: "黑體", hint: "乾淨、現代", family: "'Noto Sans TC', 'PingFang TC', sans-serif", file: "NotoSansTC-Regular.otf", sizeMul: 0.9, letterSpacing: "0.06em" },
  { key: "mono", name: "打字", hint: "像底片邊緣的日期", family: "'IBM Plex Mono', 'LXGW WenKai TC', monospace", file: "IBMPlexMono-Regular.ttf", sizeMul: 0.85, letterSpacing: "0.1em" },
];
export const captionFont = (key?: CaptionFont | null) => CAPTION_FONTS.find((f) => f.key === key) ?? CAPTION_FONTS[0];

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
  captionFont?: CaptionFont;
  /** 舊欄位（s/m/l），新資料用 captionSizeMm */
  captionSize?: CaptionSize;
  captionSizeMm?: number;
  /** 旋轉角度（度），順時針為正，整圈皆可（存 -180–180） */
  captionRotate?: number;
  /** 一句話的顏色 #RRGGBB；未設定為自動 */
  captionColor?: string;
  captionPos?: CaptionPos;
  /** 舊欄位，已不使用：放置方式由位置推導（見 captionPlace()） */
  captionPlace?: CaptionPlace;
  /** 壓在照片上時的墨色，由前端依底色亮度決定並存下，列印端沿用 */
  captionInk?: CaptionInk;
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
    captionFont: "hand",
    captionSizeMm: CAPTION_SIZE.default,
    captionRotate: 0,
    captionPos: { ...CAPTION_POS_DEFAULT },
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

type SpecGeo = Pick<PrintSpec, "frame" | "orientation" | "caption" | "captionPos" | "captionSize" | "captionSizeMm" | "captionFont">;

/** 字高 mm：使用者設定的字高 × 字體的 sizeMul，夾在允許範圍內 */
/** 一句話的估計寬度（以字高為單位）：全形字 1、半形 0.55、空白 0.3，再加字距 */
export function captionTextEm(text: string, font: CaptionFont | undefined) {
  const ls = parseFloat(captionFont(font).letterSpacing) || 0;
  let em = 0;
  for (const ch of text.trim()) em += (ch === " " ? 0.3 : ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55) + ls;
  return em;
}
/** 這句話在這張紙上最大能放的字高（使用者設定值，未乘 sizeMul）：整句要放得進安全區的寬度 */
export function captionMaxSizeMm(spec: Pick<PrintSpec, "orientation" | "caption" | "captionFont">) {
  const em = captionTextEm(spec.caption ?? "", spec.captionFont) * captionFont(spec.captionFont).sizeMul;
  if (em <= 0) return CAPTION_SIZE.max;
  const usable = paperSize(spec.orientation).w - SAFE_INSET * 2;
  return Math.max(CAPTION_SIZE.min, Math.min(CAPTION_SIZE.max, Math.floor((usable / em) * 10) / 10));
}
export function captionSizeMm(spec: Pick<PrintSpec, "captionSize" | "captionSizeMm" | "captionFont" | "orientation" | "caption">) {
  const base = spec.captionSizeMm ?? (spec.captionSize ? LEGACY_SIZE[spec.captionSize] : CAPTION_SIZE.default);
  return Math.max(CAPTION_SIZE.min, Math.min(captionMaxSizeMm(spec), base)) * captionFont(spec.captionFont).sizeMul;
}

/** 照片下緣距紙底的 mm（拍立得 = 22，其餘 = 框厚） */
function photoBottomMm(spec: Pick<PrintSpec, "frame" | "orientation">) {
  const paper = paperSize(spec.orientation);
  const area = photoArea(spec.orientation, spec.frame);
  return paper.h - (area.y + area.h);
}

/** 預設位置：拍立得在下帶正中；其他框在照片下緣往上一點 */
export function captionDefaultPos(spec: Pick<PrintSpec, "frame" | "orientation" | "caption" | "captionSize" | "captionSizeMm" | "captionFont">): CaptionPos {
  if (spec.frame === "polaroid") return { ...CAPTION_POS_DEFAULT };
  const r = captionYRange(spec);
  return { x: 0.5, y: Math.max(r.min, photoBottomMm(spec) + 4) };
}

/** 文字實際落在哪：由位置決定。基線落在照片下緣以下就是「帶」，否則就是壓在照片上。 */
export function captionPlace(spec: SpecGeo): CaptionPlace {
  if (spec.frame !== "polaroid") return "photo";
  const y = spec.captionPos?.y ?? CAPTION_POS_DEFAULT.y;
  return y < photoBottomMm(spec) ? "band" : "photo";
}

/**
 * 文字 y（基線距紙底 mm）的合法範圍。
 * 唯一規則：整個文字框離紙的四邊至少 SAFE_INSET，三種框、帶內或照片上都一樣。
 */
export function captionYRange(spec: Pick<PrintSpec, "frame" | "orientation" | "caption" | "captionSize" | "captionSizeMm" | "captionFont">) {
  const paper = paperSize(spec.orientation);
  const size = captionSizeMm(spec);
  const min = SAFE_INSET + CAPTION_DESCENT * size;
  const max = paper.h - SAFE_INSET - CAPTION_ASCENT * size;
  return { min, max: Math.max(min, max) };
}

export function captionPos(spec: SpecGeo): CaptionPos {
  const r = captionYRange(spec);
  const p = spec.captionPos ?? captionDefaultPos(spec);
  return { x: clamp01(p.x), y: Math.max(r.min, Math.min(r.max, p.y)) };
}

/** 文字可放置的水平範圍（相紙寬度比例）：同樣只看安全區，與框和放置方式無關 */
export function captionXBounds(spec: Pick<PrintSpec, "orientation">) {
  const paper = paperSize(spec.orientation);
  return { min: SAFE_INSET / paper.w, max: 1 - SAFE_INSET / paper.w };
}

export function captionInkHex(ink: CaptionInk | undefined) {
  return ink === "light" ? CAPTION_ON_PHOTO.light : CAPTION_ON_PHOTO.dark;
}
