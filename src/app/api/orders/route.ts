import { z } from "zod";
import { after } from "next/server";
import { and, gte, sql } from "drizzle-orm";
import { ready, schema } from "@/lib/db";
import { newId, nowIso, orderShortCode } from "@/lib/ids";
import { handler, parseBody, json, fail } from "@/lib/api";
import { getAlbumByCode, getPhotoByFrame, getSettings } from "@/lib/queries";
import { effectivePixels, resolutionLevel, CAPTION, type PrintSpec } from "@/lib/print-spec";
import { generatePrint } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const specSchema = z.object({
  orientation: z.enum(["portrait", "landscape"]),
  crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.01).max(1), h: z.number().min(0.01).max(1) }),
  tone: z.enum(["color", "bw"]),
  frame: z.enum(["none", "thin", "polaroid"]),
  paper: z.enum(["white", "cream", "black", "sage", "tea"]),
  caption: z.string().max(CAPTION.maxChars).default(""),
  captionFont: z.enum(["hand", "serif", "sans", "mono"]).default("hand"),
  captionPos: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(148) }).optional(),
  captionPlace: z.enum(["band", "photo"]).optional(),
  captionSize: z.enum(["s", "m", "l"]).optional(),
  captionSizeMm: z.number().min(1).max(16).optional(),
  captionRotate: z.number().min(-180).max(180).optional(),
  captionColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  captionInk: z.enum(["light", "dark"]).optional(),
  finish: z.enum(["glossy", "matte"]),
});

/** 訪客送出列印需求 */
export const POST = handler(async (req) => {
  const body = await parseBody(
    req,
    z.object({
      code: z.string().min(1),
      frameNo: z.string().min(1),
      spec: specSchema,
      guestName: z.string().trim().min(1, "要留個名字").max(40),
      note: z.string().trim().max(200).default(""),
      deviceHint: z.string().max(60).default(""),
      physicalFrame: z.enum(["none", "white", "wood"]).default("none"),
    }),
  );
  const album = await getAlbumByCode(body.code);
  if (!album || !album.visible) return fail("這本已經收起來了", 404);
  const photo = await getPhotoByFrame(album.id, body.frameNo);
  if (!photo || !photo.visible) return fail("找不到這張", 404);
  const spec: PrintSpec = { ...body.spec, caption: body.spec.caption.trim() };
  if (spec.crop.x + spec.crop.w > 1.0001 || spec.crop.y + spec.crop.h > 1.0001) return fail("裁切超出範圍");
  const st = await getSettings();
  if (!st.finishEnabled) spec.finish = "glossy";
  const physicalFrame = st.physicalFrameEnabled ? body.physicalFrame : "none";
  if (resolutionLevel(spec, { w: photo.width, h: photo.height }) === "block") return fail("這張裁切後解析度太低，請放寬裁切範圍");
  const eff = effectivePixels(spec, { w: photo.width, h: photo.height });

  const d = await ready();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const cnt = await d
    .select({ n: sql<number>`count(*)` })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, dayStart)))
    .get();
  const id = newId();
  const shortCode = orderShortCode(now, (cnt?.n ?? 0) + 1);
  await d.insert(schema.orders).values({
    id,
    shortCode,
    albumId: album.id,
    photoId: photo.id,
    spec,
    effectiveW: eff.w,
    effectiveH: eff.h,
    guestName: body.guestName,
    note: body.note,
    deviceHint: body.deviceHint,
    physicalFrame,
    status: "new",
    createdAt: nowIso(),
  });
  // 回應後在背景產生列印檔；失敗也沒關係，管理端下載時會再產生
  after(async () => {
    try {
      await generatePrint(id);
    } catch (e) {
      console.error("generatePrint failed", e);
    }
  });
  return json({ ok: true, shortCode });
});
