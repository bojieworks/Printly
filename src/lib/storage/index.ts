import { env } from "@/lib/env";
import { LocalStorage } from "./local";
import { R2Storage } from "./r2";

export interface StorageDriver {
  readonly kind: "local" | "r2";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** 可公開讀取的網址（衍生檔）；本機模式走 /media 路由 */
  publicUrl(key: string): string;
  /** 直接上傳：回傳瀏覽器可以 PUT 的網址，或 null 表示需走伺服器路由 */
  presignPut(key: string, contentType: string, bytes: number): Promise<string | null>;
  /** 需登入才可讀的檔案（原檔、列印檔）：回傳短效網址或 null 表示由伺服器串流 */
  presignGet(key: string, filename?: string): Promise<string | null>;
}

const g = globalThis as unknown as { __printly_storage?: StorageDriver };

export function storage(): StorageDriver {
  if (!g.__printly_storage) {
    g.__printly_storage = env.storageDriver === "r2" ? new R2Storage() : new LocalStorage();
  }
  return g.__printly_storage;
}

export const keys = {
  original: (albumId: string, photoId: string, ext: string) => `albums/${albumId}/originals/${photoId}.${ext}`,
  derivative: (albumId: string, photoId: string, w: number) => `albums/${albumId}/derivatives/${photoId}-${w}.webp`,
  print: (orderId: string) => `prints/${orderId}.png`,
  upload: (albumId: string, uploadId: string, ext: string) => `albums/${albumId}/uploads/${uploadId}.${ext}`,
  calibration: () => `system/calibration.png`,
};
