import { z } from "zod";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { newAlbumCode, nowIso } from "@/lib/ids";
import { handler, parseBody, json, fail } from "@/lib/api";
import { listPhotos } from "@/lib/queries";
import { deletePhoto } from "@/lib/services";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(
    req,
    z.object({
      title: z.string().trim().min(1).optional(),
      subtitleEn: z.string().trim().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      story: z.string().trim().optional(),
      visible: z.boolean().optional(),
      coverPhotoId: z.string().nullable().optional(),
      regenerateCode: z.boolean().optional(),
    }),
  );
  const d = await ready();
  const { regenerateCode, ...rest } = body;
  const patch: Partial<typeof schema.albums.$inferInsert> = { ...rest, updatedAt: nowIso() };
  if (regenerateCode) patch.code = newAlbumCode();
  await d.update(schema.albums).set(patch).where(eq(schema.albums.id, id));
  const row = await d.select().from(schema.albums).where(eq(schema.albums.id, id)).get();
  if (!row) return fail("not found", 404);
  return json(row);
});

export const DELETE = handler(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const d = await ready();
  for (const p of await listPhotos(id)) await deletePhoto(p.id);
  await d.delete(schema.albums).where(eq(schema.albums.id, id));
  return json({ ok: true });
});
