import { z } from "zod";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { storage } from "@/lib/storage";
import { nowIso } from "@/lib/ids";
import { handler, parseBody, json, fail } from "@/lib/api";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { status } = await parseBody(req, z.object({ status: z.enum(["new", "printed", "delivered"]) }));
  const d = await ready();
  const patch: Partial<typeof schema.orders.$inferInsert> = { status };
  if (status === "printed") patch.printedAt = nowIso();
  if (status === "delivered") patch.deliveredAt = nowIso();
  await d.update(schema.orders).set(patch).where(eq(schema.orders.id, id));
  return json({ ok: true });
});

export const DELETE = handler(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const d = await ready();
  const o = await d.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  if (!o) return fail("not found", 404);
  if (o.printKey) await storage().delete(o.printKey).catch(() => {});
  await d.delete(schema.orders).where(eq(schema.orders.id, id));
  return json({ ok: true });
});
