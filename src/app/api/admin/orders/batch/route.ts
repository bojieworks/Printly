import { z } from "zod";
import { inArray } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { nowIso } from "@/lib/ids";
import { handler, parseBody, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const { ids, status } = await parseBody(req, z.object({ ids: z.array(z.string()).min(1), status: z.enum(["printed", "delivered"]) }));
  const d = await ready();
  const patch: Partial<typeof schema.orders.$inferInsert> = { status };
  if (status === "printed") patch.printedAt = nowIso();
  if (status === "delivered") patch.deliveredAt = nowIso();
  await d.update(schema.orders).set(patch).where(inArray(schema.orders.id, ids));
  return json({ ok: true, n: ids.length });
});
