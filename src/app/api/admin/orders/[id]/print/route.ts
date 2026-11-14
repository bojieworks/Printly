import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { storage } from "@/lib/storage";
import { generatePrint } from "@/lib/services";
import { handler, fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

/** 取得列印檔。沒有就現場產生。?regenerate=1 強制重算。 */
export const GET = handler(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const d = await ready();
  const o = await d.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  if (!o) return fail("not found", 404);
  const s = storage();
  let key = o.printKey;
  if (!key || url.searchParams.get("regenerate") || !(await s.exists(key))) key = await generatePrint(id);
  if (url.searchParams.get("meta")) return json({ key, generatedAt: new Date().toISOString() });
  const filename = `${o.shortCode}.png`;
  const signed = await s.presignGet(key, filename);
  if (signed) return NextResponse.redirect(signed);
  const buf = await s.get(key);
  return new NextResponse(new Uint8Array(buf), {
    headers: { "content-type": "image/png", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store" },
  });
});
