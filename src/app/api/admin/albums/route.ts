import { z } from "zod";
import { ready, schema } from "@/lib/db";
import { newId, newAlbumCode, nowIso, today } from "@/lib/ids";
import { handler, parseBody, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const body = await parseBody(
    req,
    z.object({
      title: z.string().trim().min(1, "要有名稱"),
      subtitleEn: z.string().trim().default(""),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(today()),
      story: z.string().trim().default(""),
    }),
  );
  const d = await ready();
  const id = newId();
  const code = newAlbumCode();
  await d.insert(schema.albums).values({ id, code, ...body, visible: false, createdAt: nowIso(), updatedAt: nowIso() });
  return json({ id, code });
});
