import { and, eq, sql } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { storage, keys } from "@/lib/storage";
import { openOriginal, buildDerivatives, extOf } from "@/lib/images/derivatives";
import { renderPrint } from "@/lib/images/print";
import { newId, nowIso, frameNo } from "@/lib/ids";
import { getSettings } from "@/lib/queries";

const { photos, uploads, orders, albums } = schema;

/** 上傳完成後：讀暫存檔、擺正、算雜湊、存原檔、產衍生檔、建立 photo 列 */
export async function processUpload(uploadId: string) {
  const d = await ready();
  const s = storage();
  const up = await d.select().from(uploads).where(eq(uploads.id, uploadId)).get();
  if (!up) throw new Error("upload not found");
  if (up.status === "done" && up.photoId) return up.photoId;
  try {
    if (!(await s.exists(up.key))) throw new Error("檔案還沒上傳完成");
    const original = await s.get(up.key);
    if (original.length === 0) throw new Error("檔案是空的");
    const info = await openOriginal(original, up.name);

    // 重複檢查（同一相簿內同一內容）
    const dup = await d
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.albumId, up.albumId), eq(photos.sha256, info.sha256)))
      .get();
    if (dup) throw new Error("重複：這張已經在相簿裡");

    const photoId = newId();
    const ext = extOf(up.name, info.format);
    const originalKey = keys.original(up.albumId, photoId, ext);
    await s.put(originalKey, original, up.contentType || "application/octet-stream");
    const derivatives = await buildDerivatives(up.albumId, photoId, info.workBuffer, info.width);

    // 格號：取目前最大格號 + 1
    const maxRow = await d
      .select({ m: sql<number>`coalesce(max(cast(substr(frame_no, 1, length(frame_no) - 1) as integer)), 0)` })
      .from(photos)
      .where(eq(photos.albumId, up.albumId))
      .get();
    const next = (maxRow?.m ?? 0) + 1;
    const portrait = info.height > info.width;
    const sortRow = await d.select({ m: sql<number>`coalesce(max(sort), 0)` }).from(photos).where(eq(photos.albumId, up.albumId)).get();

    await d.insert(photos).values({
      id: photoId,
      albumId: up.albumId,
      frameNo: frameNo(next),
      originalKey,
      originalName: up.name,
      originalBytes: original.length,
      originalFormat: info.format,
      sha256: info.sha256,
      width: info.width,
      height: info.height,
      takenAt: info.takenAt,
      derivatives,
      caption: "",
      layout: portrait ? "tall" : next % 3 === 2 ? "half" : "full",
      visible: true,
      sort: (sortRow?.m ?? 0) + 1,
      createdAt: nowIso(),
    });
    await d.update(uploads).set({ status: "done", photoId }).where(eq(uploads.id, uploadId));
    await s.delete(up.key).catch(() => {});
    // 第一張自動成為封面
    const album = await d.select().from(albums).where(eq(albums.id, up.albumId)).get();
    if (album && !album.coverPhotoId) await d.update(albums).set({ coverPhotoId: photoId }).where(eq(albums.id, up.albumId));
    await d.update(albums).set({ updatedAt: nowIso() }).where(eq(albums.id, up.albumId));
    return photoId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await d.update(uploads).set({ status: "failed", error: msg }).where(eq(uploads.id, uploadId));
    throw e;
  }
}

/** 從原檔與 PrintSpec 產生列印檔，存檔並更新訂單。可重複呼叫（重新產生）。 */
export async function generatePrint(orderId: string) {
  const d = await ready();
  const s = storage();
  const o = await d.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!o) throw new Error("order not found");
  const p = await d.select().from(photos).where(eq(photos.id, o.photoId)).get();
  if (!p) throw new Error("photo not found");
  const original = await s.get(p.originalKey);
  const info = await openOriginal(original, p.originalName);
  const st = await getSettings();
  const png = await renderPrint(info.workBuffer, { w: info.width, h: info.height }, o.spec, { paperColors: st.paperColors });
  const key = keys.print(orderId);
  await s.put(key, png, "image/png");
  await d.update(orders).set({ printKey: key, printGeneratedAt: nowIso() }).where(eq(orders.id, orderId));
  return key;
}

export async function deletePhoto(photoId: string) {
  const d = await ready();
  const s = storage();
  const p = await d.select().from(photos).where(eq(photos.id, photoId)).get();
  if (!p) return;
  await d.delete(photos).where(eq(photos.id, photoId));
  const album = await d.select().from(albums).where(eq(albums.id, p.albumId)).get();
  if (album?.coverPhotoId === photoId) {
    const next = await d.select({ id: photos.id }).from(photos).where(eq(photos.albumId, p.albumId)).get();
    await d.update(albums).set({ coverPhotoId: next?.id ?? null }).where(eq(albums.id, p.albumId));
  }
  // 已送出的訂單仍引用原檔以便重新產生，所以只有在沒有訂單引用時才刪實體檔
  const used = await d.select({ id: orders.id }).from(orders).where(eq(orders.photoId, photoId)).get();
  if (!used) {
    await s.delete(p.originalKey).catch(() => {});
    for (const k of Object.values(p.derivatives)) await s.delete(k).catch(() => {});
  }
}
