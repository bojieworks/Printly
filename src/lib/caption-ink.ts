"use client";
import { CAPTION_ON_PHOTO, captionPos, captionSizeMm, paperSize, photoArea, viewFromCrop, type CaptionInk, type PrintSpec } from "@/lib/print-spec";

const cache = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // R2 需要 CORS；本機同源
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("img"));
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

/**
 * 文字壓在照片上時，取文字底下那一塊的平均亮度決定墨色。
 * 與 lib/images/print.ts 的 autoInk 用同一個門檻；結果存進 spec.captionInk，列印端沿用。
 */
export async function autoCaptionInk(src: string, original: { w: number; h: number }, spec: PrintSpec): Promise<CaptionInk> {
  try {
    const img = await load(src);
    const paper = paperSize(spec.orientation);
    const area = photoArea(spec.orientation, spec.frame);
    const pos = captionPos(spec);
    // 照片區域內的可見範圍（相對原圖）
    const view = viewFromCrop(original, area, spec.crop);
    const coverMm = Math.max(area.w / original.w, area.h / original.h) * view.zoom; // mm per source px
    const visWmm = area.w, visHmm = area.h;
    const srcX0 = ((original.w * coverMm - visWmm) * view.ox) / coverMm; // source px
    const srcY0 = ((original.h * coverMm - visHmm) * view.oy) / coverMm;
    // 文字框（mm，相紙座標）→ 轉成原圖座標
    const fontMm = captionSizeMm(spec);
    const cxMm = pos.x * paper.w, baseMm = paper.h - pos.y;
    const box = { l: cxMm - paper.w * 0.18, r: cxMm + paper.w * 0.18, t: baseMm - fontMm * 1.1, b: baseMm + fontMm * 0.3 };
    const clampL = Math.max(area.x, box.l), clampR = Math.min(area.x + area.w, box.r);
    const clampT = Math.max(area.y, box.t), clampB = Math.min(area.y + area.h, box.b);
    const toSrc = (mmX: number, mmY: number) => ({ x: srcX0 + (mmX - area.x) / coverMm, y: srcY0 + (mmY - area.y) / coverMm });
    const a = toSrc(clampL, clampT), b = toSrc(clampR, clampB);
    const scale = img.naturalWidth / original.w; // 衍生檔相對原圖
    const sx = Math.max(0, a.x * scale), sy = Math.max(0, a.y * scale);
    const sw = Math.max(1, (b.x - a.x) * scale), sh = Math.max(1, (b.y - a.y) * scale);
    const c = document.createElement("canvas");
    c.width = 16; c.height = 8;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, sx, sy, sw, sh, 0, 0, 16, 8);
    const d = g.getImageData(0, 0, 16, 8).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const lum = sum / (d.length / 4);
    if (spec.tone === "bw") { /* 灰階亮度相同，不用另算 */ }
    return lum > CAPTION_ON_PHOTO.lumThreshold ? "dark" : "light";
  } catch {
    return "dark";
  }
}
