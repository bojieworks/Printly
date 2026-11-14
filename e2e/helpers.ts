import { request, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const BASE = "http://localhost:3000";
export const PASSWORD = process.env.ADMIN_PASSWORD || "print";
export const STATE_FILE = path.resolve("test-results/e2e-state.json");
export const FIXTURES = path.resolve("test-results/fixtures");

export interface E2EState { code: string; albumId: string; frames: string[]; title: string }

export function readState(): E2EState {
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

export async function adminApi(): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: BASE });
  const r = await ctx.post("/api/admin/login", { data: { password: PASSWORD } });
  if (!r.ok()) throw new Error(`login failed ${r.status()} ${await r.text()}`);
  return ctx;
}

export async function makeFixtures() {
  fs.mkdirSync(FIXTURES, { recursive: true });
  const { default: sharp } = await import("sharp");
  const make = async (name: string, w: number, h: number, c1: string, c2: string) => {
    const file = path.join(FIXTURES, `${name}.jpg`);
    if (fs.existsSync(file)) return file;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.65}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.08}" fill="#E8B48A"/><path d="M0 ${h * 0.7} Q ${w * 0.3} ${h * 0.55} ${w * 0.6} ${h * 0.68} T ${w} ${h * 0.62} L ${w} ${h} L 0 ${h} Z" fill="#6D7F61"/><rect x="${w * 0.1}" y="${h * 0.1}" width="${w * 0.12}" height="${h * 0.12}" fill="#C4302B"/><text x="${w * 0.05}" y="${h * 0.95}" font-size="${h * 0.06}" fill="#fff" font-family="sans-serif">${name} ${w}x${h}</text></svg>`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(file);
    return file;
  };
  return {
    land: await make("land", 4032, 3024, "#cdb79a", "#e6d7bf"),
    port: await make("port", 3024, 4032, "#b9c4c6", "#dfe1d8"),
    small: await make("small", 1600, 1067, "#d8c7ae", "#bfa98c"),
    extra: await make("extra", 3000, 2000, "#b9a0a8", "#e8cfc0"),
  };
}

export async function uploadViaApi(ctx: APIRequestContext, albumId: string, file: string) {
  const name = path.basename(file);
  const buf = fs.readFileSync(file);
  const init = await ctx.post(`/api/admin/albums/${albumId}/uploads`, { data: { name, type: "image/jpeg", bytes: buf.length } });
  if (!init.ok()) throw new Error(`init failed: ${await init.text()}`);
  const { uploadId, url, mode } = (await init.json()) as { uploadId: string; url: string; mode: string };
  if (mode !== "direct") throw new Error("e2e expects local storage");
  const put = await ctx.put(url, { data: buf, headers: { "content-type": "image/jpeg" } });
  if (!put.ok()) throw new Error(`put failed: ${await put.text()}`);
  const done = await ctx.post(`/api/admin/uploads/${uploadId}/complete`);
  const j = (await done.json()) as { ok?: boolean; error?: string; photo?: { frameNo: string; id: string } };
  if (!done.ok()) throw new Error(`complete failed: ${j.error}`);
  return j.photo!;
}

/** 擷圖到 test-results/screens/<project>/<name>.png，供人工檢視 */
export async function shot(page: Page, project: string, name: string, fullPage = true) {
  const dir = path.resolve("test-results/screens", project);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage });
}

export async function loginUi(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("密碼").fill(PASSWORD);
  await page.getByRole("button", { name: /進去/ }).click();
  await page.waitForURL(/\/admin\/albums/);
}

/** 滑動：以滑鼠拖曳模擬，對應程式裡的 pointer events（觸控裝置上同樣走 pointer events） */
export async function swipe(page: Page, _selector: string, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}
