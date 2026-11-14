import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { processUpload } from "@/lib/services";
import { handler, json, fail } from "@/lib/api";
import { toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Ctx = { params: Promise<{ uploadId: string }> };

/** 檔案已在儲存空間：處理並建立照片 */
export const POST = handler(async (_req, ctx: Ctx) => {
  const { uploadId } = await ctx.params;
  try {
    const photoId = await processUpload(uploadId);
    const d = await ready();
    const p = await d.select().from(schema.photos).where(eq(schema.photos.id, photoId)).get();
    return json({ ok: true, photo: p ? { ...toPhotoView(p), originalName: p.originalName, visible: p.visible } : null });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "失敗", 422);
  }
});
