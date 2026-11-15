import sharp, { type OverlayOptions } from "sharp";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  CAPTION,
  PX_PER_MM,
  CAPTION_ON_PHOTO,
  captionFont,
  captionInk,
  captionInkHex,
  hexLuminance,
  isHexColor,
  captionPlace,
  captionPos,
  captionRotate,
  captionSizeMm,
  captionXBounds,
  outputSize,
  paperHex,
  paperSize,
  photoArea,
  type PrintSpec,
} from "@/lib/print-spec";

const FONT_DIR = path.resolve(process.cwd(), "assets/fonts");
const FALLBACK_FONT = path.join(FONT_DIR, "LXGWWenKaiTC-Regular.ttf");

export interface RenderOptions {
  paperColors?: Record<string, string> | null;
}

/**
 * 依 DESIGN_SYSTEM §2.3 的順序合成列印檔：
 * 1. 紙色填滿 2. 放入裁切後的照片（套 tone） 3. 拍立得時寫入一句話
 * 輸入必須是已套用 Exif 方向的工作用 buffer（openOriginal 的 workBuffer）。
 * 輸出 PNG，sRGB，300 dpi。
 */
export async function renderPrint(work: Buffer, original: { w: number; h: number }, spec: PrintSpec, opts: RenderOptions = {}) {
  const out = outputSize(spec.orientation);
  const paper = paperSize(spec.orientation);
  const area = photoArea(spec.orientation, spec.frame);
  const mm = PX_PER_MM; // 長寬同一個比例

  const areaPx = {
    left: Math.round(area.x * mm),
    top: Math.round(area.y * mm),
    width: Math.round(area.w * mm),
    height: Math.round(area.h * mm),
  };

  // 裁切：crop 為 0–1，相對於擺正後的原圖
  const crop = {
    left: Math.max(0, Math.round(spec.crop.x * original.w)),
    top: Math.max(0, Math.round(spec.crop.y * original.h)),
    width: Math.max(1, Math.round(spec.crop.w * original.w)),
    height: Math.max(1, Math.round(spec.crop.h * original.h)),
  };
  crop.width = Math.min(crop.width, original.w - crop.left);
  crop.height = Math.min(crop.height, original.h - crop.top);

  let photo = sharp(work).extract(crop).resize(areaPx.width, areaPx.height, { fit: "fill", kernel: "lanczos3" });
  if (spec.tone === "bw") photo = photo.grayscale();
  const photoBuf = await photo.png().toBuffer();

  const composites: OverlayOptions[] = [{ input: photoBuf, left: areaPx.left, top: areaPx.top }];

  if (spec.caption.trim()) {
    const font = captionFont(spec.captionFont);
    const place = captionPlace(spec);
    const pos = captionPos(spec);
    const xb = captionXBounds(spec);
    const sizeMm = captionSizeMm(spec);
    let ink: string = captionInk(spec.paper);
    if (place === "photo") {
      ink = captionInkHex(spec.captionInk ?? (await autoInk(photoBuf, areaPx, out, pos, mm, sizeMm)));
    }
    if (isHexColor(spec.captionColor)) ink = spec.captionColor; // 使用者指定的顏色優先
    const capPng = await renderCaption(spec.caption.trim(), {
      widthPx: out.w,
      bandLeftPx: xb.min * out.w,
      bandWidthPx: (xb.max - xb.min) * out.w,
      centerX: pos.x,
      fontPx: sizeMm * mm,
      baselinePx: out.h - pos.y * mm,
      color: ink,
      shadow: place === "photo",
      rotate: captionRotate(spec),
      heightPx: out.h,
      fontFile: path.join(FONT_DIR, font.file),
      family: font.family.split(",")[0].replace(/['"]/g, "").trim(),
      letterSpacingEm: parseFloat(font.letterSpacing) || 0,
    });
    composites.push({ input: capPng, left: 0, top: 0 });
  }

  const png = await sharp({
    create: { width: out.w, height: out.h, channels: 3, background: paperHex(spec.paper, opts.paperColors) },
  })
    .composite(composites)
    .removeAlpha()
    .withMetadata({ density: Math.round(PX_PER_MM * 25.4) }) // 300 dpi
    .png({ compressionLevel: 6 })
    .toBuffer();
  return png;
}

async function renderCaption(text: string, o: { widthPx: number; bandLeftPx: number; bandWidthPx: number; centerX: number; fontPx: number; baselinePx: number; color: string; fontFile: string; family: string; letterSpacingEm: number; shadow?: boolean; rotate?: number; heightPx?: number }) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // 單行；過長時縮小字級到 2.6 mm（約 0.81 倍），再超過就截斷
  let fontPx = o.fontPx;
  let content = text;
  const measure = (t: string, f: number) => t.length * f * (0.98 + o.letterSpacingEm); // 方塊字近似，英文會偏寬估
  if (measure(content, fontPx) > o.bandWidthPx) fontPx = o.fontPx * 0.81;
  while (content.length > 1 && measure(content, fontPx) > o.bandWidthPx) content = content.slice(0, -1);
  // 文字中心依 centerX 放置，但整段文字（旋轉後的外框）要留在帶內
  const t = ((o.rotate ?? 0) * Math.PI) / 180;
  const half = (measure(content, fontPx) * Math.abs(Math.cos(t)) + fontPx * Math.abs(Math.sin(t))) / 2;
  const cx = Math.min(o.widthPx - o.bandLeftPx - half, Math.max(o.bandLeftPx + half, o.centerX * o.widthPx));
  const height = o.heightPx ?? Math.ceil(o.baselinePx + fontPx);
  // 以文字中心（基線往上約 0.35 字高）為軸旋轉
  const rot = o.rotate ? ` transform="rotate(${o.rotate} ${cx} ${o.baselinePx - fontPx * 0.35})"` : "";
  const textAttrs = `x="${cx}" y="${o.baselinePx}" text-anchor="middle" font-family="${esc(o.family)}, LXGW WenKai TC" font-size="${fontPx}" letter-spacing="${o.letterSpacingEm * fontPx}"${rot}`;
  // 壓在照片上時加一層極淡的柔影，讓中間調的底也讀得到；不描邊
  const shadow = o.shadow
    ? `<defs><filter id="sh" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="${fontPx * 0.06}"/></filter></defs>
  <g transform="translate(0, ${fontPx * 0.04})"><text ${textAttrs} fill="${hexLuminance(o.color) > 0.4 ? "#000" : "#fff"}" opacity="0.28" filter="url(#sh)">${esc(content)}</text></g>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${o.widthPx}" height="${height}">
  ${shadow}
  <text ${textAttrs} fill="${o.color}">${esc(content)}</text>
</svg>`;
  const r = new Resvg(svg, {
    font: { fontFiles: [o.fontFile, FALLBACK_FONT], loadSystemFonts: false, defaultFontFamily: o.family },
    fitTo: { mode: "original" },
  });
  return r.render().asPng();
}

/** 文字底下那一塊的平均亮度 → 墨色。與前端 lib/caption-ink.ts 用同一個門檻。 */
async function autoInk(photoPng: Buffer, areaPx: { left: number; top: number; width: number; height: number }, out: { w: number; h: number }, pos: { x: number; y: number }, mm: number, sizeMm: number): Promise<"light" | "dark"> {
  const fontPx = sizeMm * mm;
  const cx = pos.x * out.w;
  const baseline = out.h - pos.y * mm;
  const box = {
    left: Math.max(areaPx.left, Math.round(cx - out.w * 0.18)),
    top: Math.max(areaPx.top, Math.round(baseline - fontPx * 1.1)),
    right: Math.min(areaPx.left + areaPx.width, Math.round(cx + out.w * 0.18)),
    bottom: Math.min(areaPx.top + areaPx.height, Math.round(baseline + fontPx * 0.3)),
  };
  const w = Math.max(1, box.right - box.left), h = Math.max(1, box.bottom - box.top);
  const { data } = await sharp(photoPng).extract({ left: box.left - areaPx.left, top: box.top - areaPx.top, width: w, height: h }).resize(16, 8, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let i = 0; i < data.length; i += 3) sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  const lum = sum / (data.length / 3);
  return lum > CAPTION_ON_PHOTO.lumThreshold ? "dark" : "light";
}

/** 校正圖：四邊 1 mm 刻度與中央說明，印出後量各邊被裁掉的毫米數 */
export async function renderCalibration() {
  const w = 1200,
    h = 1776;
  const mm = PX_PER_MM;
  let ticks = "";
  for (let i = 0; i <= 10; i++) {
    const p = i * mm;
    const len = i % 5 === 0 ? 10 * mm : 5 * mm;
    // top / bottom / left / right
    ticks += `<line x1="${w / 2 - len / 2}" y1="${p}" x2="${w / 2 + len / 2}" y2="${p}" stroke="#1C1B19" stroke-width="1.5"/>`;
    ticks += `<line x1="${w / 2 - len / 2}" y1="${h - p}" x2="${w / 2 + len / 2}" y2="${h - p}" stroke="#1C1B19" stroke-width="1.5"/>`;
    ticks += `<line x1="${p}" y1="${h / 2 - len / 2}" x2="${p}" y2="${h / 2 + len / 2}" stroke="#1C1B19" stroke-width="1.5"/>`;
    ticks += `<line x1="${w - p}" y1="${h / 2 - len / 2}" x2="${w - p}" y2="${h / 2 + len / 2}" stroke="#1C1B19" stroke-width="1.5"/>`;
    if (i % 5 === 0) {
      const fs = 2.5 * mm;
      // top / bottom labels to the right of the ruler; left / right labels under the ruler
      ticks += `<text x="${w / 2 + 6 * mm}" y="${Math.max(fs, p + fs * 0.35)}" font-size="${fs}" fill="#7D776C">${i}</text>`;
      ticks += `<text x="${w / 2 + 6 * mm}" y="${h - p + fs * 0.35}" font-size="${fs}" fill="#7D776C">${i}</text>`;
      ticks += `<text x="${Math.max(2, p - fs * 0.3)}" y="${h / 2 + 6 * mm + fs}" font-size="${fs}" fill="#7D776C">${i}</text>`;
      ticks += `<text x="${w - p - fs * 0.6}" y="${h / 2 + 6 * mm + fs}" font-size="${fs}" fill="#7D776C">${i}</text>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#FFFFFF"/>
  <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" fill="none" stroke="#C4302B" stroke-width="1.5"/>
  <rect x="${3 * mm}" y="${3 * mm}" width="${w - 6 * mm}" height="${h - 6 * mm}" fill="none" stroke="#C4302B" stroke-width="1" stroke-dasharray="8 6"/>
  ${ticks}
  <text x="${w / 2}" y="${h / 2 - 8 * mm}" text-anchor="middle" font-size="${4 * mm}" fill="#1C1B19">CALIBRATION</text>
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="${3 * mm}" fill="#4A4741">Measure the mm lost on each edge</text>
  <text x="${w / 2}" y="${h / 2 + 6 * mm}" text-anchor="middle" font-size="${2.6 * mm}" fill="#7D776C">red frame = file edge · dashed = 3 mm</text>
</svg>`;
  const r = new Resvg(svg, { font: { loadSystemFonts: true }, fitTo: { mode: "original" } });
  const png = r.render().asPng();
  return sharp(png).withMetadata({ density: 300 }).png().toBuffer();
}
