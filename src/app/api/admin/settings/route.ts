import { z } from "zod";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { handler, parseBody, json } from "@/lib/api";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const GET = handler(async () => json(await getSettings()));

export const PATCH = handler(async (req) => {
  const body = await parseBody(
    req,
    z.object({
      studioName: z.string().trim().min(1).optional(),
      stampChar: z.string().trim().min(1).max(2).optional(),
      successStory: z.string().trim().optional(),
      calibration: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }).nullable().optional(),
      paperColors: z.record(z.string(), z.string().regex(/^#[0-9A-Fa-f]{6}$/)).nullable().optional(),
      finishEnabled: z.boolean().optional(),
      physicalFrameEnabled: z.boolean().optional(),
      checklist: z.array(z.boolean()).optional(),
    }),
  );
  const d = await ready();
  await d.update(schema.settings).set(body).where(eq(schema.settings.id, 1));
  return json(await getSettings());
});
