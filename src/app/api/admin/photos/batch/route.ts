import { z } from "zod";
import { inArray } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { handler, parseBody, json } from "@/lib/api";
import { deletePhoto } from "@/lib/services";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const { ids, action } = await parseBody(req, z.object({ ids: z.array(z.string()).min(1), action: z.enum(["show", "hide", "delete"]) }));
  const d = await ready();
  if (action === "delete") {
    for (const id of ids) await deletePhoto(id);
  } else {
    await d.update(schema.photos).set({ visible: action === "show" }).where(inArray(schema.photos.id, ids));
  }
  return json({ ok: true, n: ids.length });
});
