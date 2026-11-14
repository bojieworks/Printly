import { z } from "zod";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { handler, parseBody, json } from "@/lib/api";
import { deletePhoto } from "@/lib/services";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(
    req,
    z.object({
      caption: z.string().trim().max(60).optional(),
      layout: z.enum(["full", "half", "tall"]).optional(),
      visible: z.boolean().optional(),
      focalX: z.number().int().min(0).max(100).optional(),
      focalY: z.number().int().min(0).max(100).optional(),
      sort: z.number().int().optional(),
    }),
  );
  const d = await ready();
  await d.update(schema.photos).set(body).where(eq(schema.photos.id, id));
  return json({ ok: true });
});

export const DELETE = handler(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deletePhoto(id);
  return json({ ok: true });
});
