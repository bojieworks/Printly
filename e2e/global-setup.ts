import fs from "node:fs";
import path from "node:path";
import { adminApi, makeFixtures, uploadViaApi, STATE_FILE, type E2EState } from "./helpers";

/** 透過 API 建一本測試相簿、上傳三張圖、設為可見，供所有瀏覽器專案共用 */
export default async function globalSetup() {
  const fx = await makeFixtures();
  const ctx = await adminApi();
  const title = `E2E ${new Date().toISOString().slice(5, 16).replace("T", " ")}`;
  const r = await ctx.post("/api/admin/albums", { data: { title, subtitleEn: "End to end", date: "2026-11-14", story: "這是自動測試用的相簿。" } });
  const { id: albumId, code } = (await r.json()) as { id: string; code: string };
  const frames: string[] = [];
  for (const f of [fx.land, fx.port, fx.small]) frames.push((await uploadViaApi(ctx, albumId, f)).frameNo);
  await ctx.patch(`/api/admin/albums/${albumId}`, { data: { visible: true } });
  // 照片圖說
  const photos = (await (await ctx.get(`/api/albums?codes=${code}`)).json()) as { albums: { count: number }[] };
  if (photos.albums[0]?.count !== 3) throw new Error("setup: expected 3 photos");
  const state: E2EState = { code, albumId, frames, title };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  await ctx.dispose();
}
