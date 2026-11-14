import { NextResponse } from "next/server";
import { renderCalibration } from "@/lib/images/print";
import { handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const png = await renderCalibration();
  return new NextResponse(new Uint8Array(png), {
    headers: { "content-type": "image/png", "content-disposition": 'attachment; filename="calibration.png"' },
  });
});
