import { z } from "zod";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { storage, keys } from "@/lib/storage";
import { newId, nowIso } from "@/lib/ids";
import { extOf } from "@/lib/images/derivatives";
import { handler, parseBody, json, fail } from "@/lib/api";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const OK_EXT = /^(jpe?g|png|heic|heif|webp|tiff?)$/i;
const MAX_BYTES = 60 * 1024 * 1024;

/** 上傳初始化：回傳瀏覽器該把檔案送到哪裡 */
export const POST = handler(async (req, ctx: Ctx) => {
  const { id: albumId } = await ctx.params;
  const body = await parseBody(req, z.object({ name: z.string().min(1), type: z.string().default(""), bytes: z.number().int().nonnegative() }));
  const d = await ready();
  const album = await d.select().from(schema.albums).where(eq(schema.albums.id, albumId)).get();
  if (!album) return fail("not found", 404);
  const ext = extOf(body.name, "");
  if (!OK_EXT.test(ext)) return fail("格式：只收 JPG、PNG、HEIC、WebP、TIFF");
  if (body.bytes > MAX_BYTES) return fail("太大：單檔上限 60 MB");
  const uploadId = newId();
  const key = keys.upload(albumId, uploadId, ext);
  await d.insert(schema.uploads).values({
    id: uploadId,
    albumId,
    key,
    name: body.name,
    contentType: body.type || "application/octet-stream",
    bytes: body.bytes,
    status: "pending",
    createdAt: nowIso(),
  });
  const s = storage();
  const presigned = await s.presignPut(key, body.type || "application/octet-stream", body.bytes);
  return json({
    uploadId,
    mode: presigned ? "presigned" : "direct",
    url: presigned ?? `/api/admin/uploads/${uploadId}`,
  });
});
