import sharp from "sharp";
import { createHash } from "node:crypto";
import exifr from "exifr";
import { storage, keys } from "@/lib/storage";

export const DERIVATIVE_WIDTHS = [480, 960, 1440, 2048] as const;

export interface ProcessedOriginal {
  /** 已套用 Exif 方向、轉成 sRGB、可被 sharp 直接讀的像素來源 */
  workBuffer: Buffer;
  width: number;
  height: number;
  format: string;
  sha256: string;
  takenAt: string | null;
}

const HEIC_RE = /\.(heic|heif)$/i;

/** 讀原檔，必要時轉 HEIC，套方向，回傳工作用的 buffer 與中繼資料。原檔本身不被更動。 */
export async function openOriginal(original: Buffer, filename: string): Promise<ProcessedOriginal> {
  const sha256 = createHash("sha256").update(original).digest("hex");
  let input = original;
  let format = "";
  const isHeic = HEIC_RE.test(filename) || looksLikeHeic(original);
  if (isHeic) {
    const { default: heicConvert } = await import("heic-convert");
    const out = await heicConvert({ buffer: new Uint8Array(original), format: "JPEG", quality: 0.95 });
    input = Buffer.from(out);
    format = "heic";
  }
  // rotate() 無參數 = 依 Exif 方向擺正；toColourspace 確保 sRGB
  const work = sharp(input, { limitInputPixels: 80_000_000 }).rotate().toColourspace("srgb");
  const meta = await sharp(input).metadata();
  format = format || meta.format || "unknown";
  const workBuffer = await work.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer();
  const wm = await sharp(workBuffer).metadata();
  let takenAt: string | null = null;
  try {
    const ex = await exifr.parse(original, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d: Date | undefined = ex?.DateTimeOriginal || ex?.CreateDate;
    if (d instanceof Date && !isNaN(d.getTime())) takenAt = d.toISOString();
  } catch {
    /* 沒有 Exif 也沒關係 */
  }
  return { workBuffer, width: wm.width!, height: wm.height!, format, sha256, takenAt };
}

function looksLikeHeic(buf: Buffer) {
  // ISO BMFF: bytes 4..8 = 'ftyp', brand at 8..12
  if (buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buf.toString("ascii", 8, 12);
  return /^(heic|heix|hevc|mif1|msf1|heif)$/.test(brand);
}

/** 產生四個寬度的 WebP 並存檔，回傳 {width: key} */
export async function buildDerivatives(albumId: string, photoId: string, work: Buffer, width: number) {
  const out: Record<string, string> = {};
  const s = storage();
  for (const w of DERIVATIVE_WIDTHS) {
    const key = keys.derivative(albumId, photoId, w);
    const buf = await sharp(work)
      .resize({ width: Math.min(w, width), withoutEnlargement: true, kernel: "lanczos3" })
      .webp({ quality: 82 })
      .toBuffer();
    await s.put(key, buf, "image/webp");
    out[String(w)] = key;
  }
  return out;
}

export function extOf(filename: string, fallback = "bin") {
  const m = /\.([a-z0-9]+)$/i.exec(filename);
  return (m ? m[1] : fallback).toLowerCase();
}
