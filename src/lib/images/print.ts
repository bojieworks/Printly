import sharp, { type OverlayOptions } from "sharp";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  CAPTION,
  PX_PER_MM,
  captionInk,
  outputSize,
  paperHex,
  paperSize,
  photoArea,
  type PrintSpec,
} from "@/lib/print-spec";

const FONT_PATH = path.resolve(process.cwd(), "assets/fonts/LXGWWenKaiTC-Regular.ttf");

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
  const mm = out.w / paper.w; // = PX_PER_MM，但以輸出尺寸為準

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

  if (spec.frame === "polaroid" && spec.caption.trim()) {
    const capPng = await renderCaption(spec.caption.trim(), {
      widthPx: out.w,
      bandLeftPx: areaPx.left,
      bandWidthPx: areaPx.width,
      fontPx: CAPTION.fontSizeMm * mm,
      baselinePx: out.h - CAPTION.baselineFromBottomMm * mm,
      color: captionInk(spec.paper),
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

async function renderCaption(text: string, o: { widthPx: number; bandLeftPx: number; bandWidthPx: number; fontPx: number; baselinePx: number; color: string }) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // 單行；過長時縮小字級到 2.6 mm（約 0.81 倍），再超過就截斷
  let fontPx = o.fontPx;
  let content = text;
  const measure = (t: string, f: number) => t.length * f * 0.98; // 楷體方塊字近似，英文會偏寬估
  if (measure(content, fontPx) > o.bandWidthPx) fontPx = o.fontPx * 0.81;
  while (content.length > 1 && measure(content, fontPx) > o.bandWidthPx) content = content.slice(0, -1);
  const cx = o.bandLeftPx + o.bandWidthPx / 2;
  const height = Math.ceil(o.baselinePx + fontPx);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${o.widthPx}" height="${height}">
  <text x="${cx}" y="${o.baselinePx}" text-anchor="middle" font-family="LXGW WenKai TC" font-size="${fontPx}" fill="${o.color}">${esc(content)}</text>
</svg>`;
  const r = new Resvg(svg, {
    font: { fontFiles: [FONT_PATH], loadSystemFonts: false, defaultFontFamily: "LXGW WenKai TC" },
    fitTo: { mode: "original" },
  });
  return r.render().asPng();
}

/** 校正圖：四邊 1 mm 刻度與中央說明，印出後量各邊被裁掉的毫米數 */
export async function renderCalibration() {
  const w = 1200,
    h = 1800;
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
