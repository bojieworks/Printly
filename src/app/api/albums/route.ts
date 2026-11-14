import { inArray } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { handler, json } from "@/lib/api";
import { toPhotoView, verticalDate } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** 書架用：依代碼回傳可見相簿的摘要。不公開列出所有相簿。 */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const codes = (url.searchParams.get("codes") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
  if (!codes.length) return json({ albums: [] });
  const d = await ready();
  const rows = await d.select().from(schema.albums).where(inArray(schema.albums.code, codes)).all();
  const covers = rows.filter((a) => a.coverPhotoId).map((a) => a.coverPhotoId!);
  const photos = covers.length ? await d.select().from(schema.photos).where(inArray(schema.photos.id, covers)).all() : [];
  const counts = await d.select({ albumId: schema.photos.albumId, id: schema.photos.id }).from(schema.photos).where(inArray(schema.photos.albumId, rows.map((a) => a.id))).all();
  return json({
    albums: rows.map((a) => {
      const cover = photos.find((p) => p.id === a.coverPhotoId);
      return {
        code: a.code,
        title: a.title,
        subtitleEn: a.subtitleEn,
        date: a.date,
        vdate: verticalDate(a.date),
        story: a.story,
        visible: a.visible,
        count: counts.filter((c) => c.albumId === a.id).length,
        cover: cover ? toPhotoView(cover) : null,
      };
    }),
  });
});
