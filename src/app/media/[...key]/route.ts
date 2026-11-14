import { NextResponse, type NextRequest } from "next/server";
import { storage } from "@/lib/storage";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", heic: "image/heic", tif: "image/tiff", tiff: "image/tiff" };

/** 本機儲存模式的檔案服務。衍生檔公開；原檔、上傳暫存與列印檔需管理者。 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (key.includes("..")) return new NextResponse("bad key", { status: 400 });
  const isPublic = /\/derivatives\//.test(key);
  if (!isPublic && !(await isAdmin())) return new NextResponse("unauthorized", { status: 401 });
  const s = storage();
  if (!(await s.exists(key))) return new NextResponse("not found", { status: 404 });
  const buf = await s.get(key);
  const ext = key.split(".").pop()!.toLowerCase();
  const dl = req.nextUrl.searchParams.get("download");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      ...(dl ? { "content-disposition": `attachment; filename="${encodeURIComponent(dl)}"` } : {}),
    },
  });
}
