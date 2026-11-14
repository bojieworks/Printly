import { and, asc, desc, eq, sql } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { Album, Photo, Order, Settings } from "@/lib/db/schema";

const { albums, photos, orders, settings } = schema;

/* ---------- settings ---------- */
export async function getSettings(): Promise<Settings> {
  const d = await ready();
  const row = await d.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) throw new Error("settings missing");
  return row;
}

/* ---------- albums ---------- */
export async function listAlbums() {
  const d = await ready();
  const rows = await d.select().from(albums).orderBy(desc(albums.date), desc(albums.createdAt)).all();
  const counts = await d
    .select({ albumId: photos.albumId, n: sql<number>`count(*)` })
    .from(photos)
    .groupBy(photos.albumId)
    .all();
  const newOrders = await d
    .select({ albumId: orders.albumId, n: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, "new"))
    .groupBy(orders.albumId)
    .all();
  return rows.map((a) => ({
    ...a,
    photoCount: counts.find((c) => c.albumId === a.id)?.n ?? 0,
    newOrders: newOrders.find((c) => c.albumId === a.id)?.n ?? 0,
  }));
}

export async function getAlbum(id: string) {
  const d = await ready();
  return d.select().from(albums).where(eq(albums.id, id)).get();
}

export async function getAlbumByCode(code: string) {
  const d = await ready();
  return d.select().from(albums).where(eq(albums.code, code)).get();
}

export async function listPhotos(albumId: string, onlyVisible = false) {
  const d = await ready();
  const where = onlyVisible ? and(eq(photos.albumId, albumId), eq(photos.visible, true)) : eq(photos.albumId, albumId);
  return d.select().from(photos).where(where).orderBy(asc(photos.sort), asc(photos.createdAt)).all();
}

export async function getPhoto(id: string) {
  const d = await ready();
  return d.select().from(photos).where(eq(photos.id, id)).get();
}

export async function getPhotoByFrame(albumId: string, frameNo: string) {
  const d = await ready();
  return d.select().from(photos).where(and(eq(photos.albumId, albumId), eq(photos.frameNo, frameNo))).get();
}

/* ---------- orders ---------- */
export async function listOrders(status?: Order["status"], albumId?: string) {
  const d = await ready();
  const conds = [];
  if (status) conds.push(eq(orders.status, status));
  if (albumId) conds.push(eq(orders.albumId, albumId));
  const rows = await d
    .select({ order: orders, photo: photos, album: albums })
    .from(orders)
    .innerJoin(photos, eq(orders.photoId, photos.id))
    .innerJoin(albums, eq(orders.albumId, albums.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt))
    .all();
  return rows;
}

export async function countOrdersByStatus() {
  const d = await ready();
  const rows = await d.select({ status: orders.status, n: sql<number>`count(*)` }).from(orders).groupBy(orders.status).all();
  const out = { new: 0, printed: 0, delivered: 0 } as Record<Order["status"], number>;
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export async function getOrder(id: string) {
  const d = await ready();
  return d
    .select({ order: orders, photo: photos, album: albums })
    .from(orders)
    .innerJoin(photos, eq(orders.photoId, photos.id))
    .innerJoin(albums, eq(orders.albumId, albums.id))
    .where(eq(orders.id, id))
    .get();
}

export async function getOrderByShortCode(code: string) {
  const d = await ready();
  return d
    .select({ order: orders, photo: photos, album: albums })
    .from(orders)
    .innerJoin(photos, eq(orders.photoId, photos.id))
    .innerJoin(albums, eq(orders.albumId, albums.id))
    .where(eq(orders.shortCode, code))
    .get();
}

/* ---------- view helpers ---------- */
export interface PhotoView {
  id: string;
  frameNo: string;
  width: number;
  height: number;
  caption: string;
  layout: Photo["layout"];
  focalX: number;
  focalY: number;
  srcset: string;
  src: string;
  sizes: Record<string, string>;
  portrait: boolean;
}

export function toPhotoView(p: Photo): PhotoView {
  const s = storage();
  const entries = Object.entries(p.derivatives)
    .map(([w, key]) => [Number(w), s.publicUrl(key)] as const)
    .sort((a, b) => a[0] - b[0]);
  const sizes: Record<string, string> = {};
  for (const [w, url] of entries) sizes[String(w)] = url;
  return {
    id: p.id,
    frameNo: p.frameNo,
    width: p.width,
    height: p.height,
    caption: p.caption,
    layout: p.layout,
    focalX: p.focalX,
    focalY: p.focalY,
    srcset: entries.map(([w, url]) => `${url} ${w}w`).join(", "),
    src: entries[1]?.[1] ?? entries[0]?.[1] ?? "",
    sizes,
    portrait: p.height > p.width,
  };
}

export type AlbumView = Pick<Album, "id" | "code" | "title" | "subtitleEn" | "date" | "story" | "visible">;
export const toAlbumView = (a: Album): AlbumView => ({
  id: a.id,
  code: a.code,
  title: a.title,
  subtitleEn: a.subtitleEn,
  date: a.date,
  story: a.story,
  visible: a.visible,
});

export const verticalDate = (iso: string) => {
  const [y, m] = iso.split("-");
  const digits = "〇一二三四五六七八九";
  const yy = [...y].map((c) => digits[Number(c)]).join("");
  const mi = Number(m);
  const mm = mi <= 10 ? digits[mi] || "十" : mi === 11 ? "十一" : "十二";
  return `${yy}年${mi === 10 ? "十" : mm}月`;
};
