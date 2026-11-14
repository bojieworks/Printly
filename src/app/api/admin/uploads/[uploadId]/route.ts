import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { storage } from "@/lib/storage";
import { handler, json, fail } from "@/lib/api";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ uploadId: string }> };

/** 本機模式：瀏覽器直接把檔案 PUT 到這裡 */
export const PUT = handler(async (req, ctx: Ctx) => {
  const { uploadId } = await ctx.params;
  const d = await ready();
  const up = await d.select().from(schema.uploads).where(eq(schema.uploads.id, uploadId)).get();
  if (!up) return fail("not found", 404);
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) return fail("檔案是空的");
  await storage().put(up.key, buf, up.contentType);
  return json({ ok: true, bytes: buf.length });
});
