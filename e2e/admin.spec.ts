import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { adminApi, loginUi, readState, shot, FIXTURES, PASSWORD } from "./helpers";

const st = readState();
const isMobile = (p: Page) => (p.viewportSize()?.width ?? 1440) < 640;

test.describe("管理端", () => {
  test("未登入導向登入；密碼錯誤有提示；登入後看到相簿", async ({ page }, info) => {
    await page.goto("/admin/orders");
    await page.waitForURL(/\/admin\/login/);
    await shot(page, info.project.name, "20-login");
    await page.getByLabel("密碼").fill("wrong-password");
    await page.getByRole("button", { name: /進去/ }).click();
    await expect(page.getByText(/密碼不對/)).toBeVisible();
    await page.getByLabel("密碼").fill(PASSWORD);
    await page.getByRole("button", { name: /進去/ }).click();
    await page.waitForURL(/\/admin\/orders/);
    await expect(page.getByRole("heading", { name: "訂單" })).toBeVisible();
    await page.goto("/admin/albums");
    await expect(page.locator(".tbl")).toContainText(st.title);
    await shot(page, info.project.name, "21-albums");
  });

  test("建立相簿、上傳照片、編輯圖說、封面、可見", async ({ page }, info) => {
    await loginUi(page);
    await page.getByRole("button", { name: /新相簿/ }).click();
    await page.getByLabel("名稱").fill(`UI ${info.project.name} ${Date.now() % 10000}`);
    await page.getByLabel("一句話").fill("用介面建立的相簿");
    await page.getByRole("button", { name: "建立", exact: true }).click();
    await page.waitForURL(/\/admin\/albums\/[^/]+$/);
    await expect(page.getByText("還沒有照片")).toBeVisible();
    // 上傳兩張
    const input = page.locator('input[type="file"]');
    await input.setInputFiles([path.join(FIXTURES, "extra.jpg"), path.join(FIXTURES, "small.jpg")]);
    await expect(page.locator(".film .fr.done")).toHaveCount(2, { timeout: 60_000 });
    await expect(page.locator(".tbl tbody tr")).toHaveCount(2);
    await expect(page.locator(".tbl")).toContainText("01A");
    await expect(page.locator(".tbl")).toContainText("02A");
    await shot(page, info.project.name, "22-album-uploaded");
    // 重複上傳被拒絕
    await input.setInputFiles([path.join(FIXTURES, "extra.jpg")]);
    await expect(page.locator(".film .fr.fail")).toHaveCount(1, { timeout: 60_000 });
    await expect(page.locator(".film .fr.fail")).toContainText("重複");
    // 圖說
    const cap = page.getByLabel("01A 圖說");
    await cap.fill("往山上的路");
    await cap.blur();
    await expect(page.locator(".toast")).toContainText("圖說已儲存");
    // 封面與可見
    // 手機上的表格是橫向捲動容器，Chromium 的自動捲動會讓命中點落到別列；先自行捲到位再派送 click
    const cover2 = page.getByLabel("設為封面").nth(1);
    await cover2.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
    await cover2.dispatchEvent("click");
    await expect(page.locator(".toast")).toContainText("已設為封面");
    await page.getByRole("radio", { name: "可見" }).first().click();
    await expect(page.locator(".toast")).toContainText("可見");
    await page.reload();
    await expect(page.getByLabel("01A 圖說")).toHaveValue("往山上的路");
    await expect(page.locator(".ticket").getByRole("radio", { name: "可見" })).toHaveAttribute("aria-checked", "true");
    // 刪除一張（確認紙）
    await page.getByRole("button", { name: "刪除" }).first().click();
    await expect(page.getByRole("dialog")).toContainText("刪除 01A");
    await page.getByRole("dialog").getByRole("button", { name: "刪除" }).click();
    await expect(page.locator(".tbl tbody tr")).toHaveCount(1);
    await shot(page, info.project.name, "23-album-managed");
  });

  test("訂單：列表、狀態推進、詳情、列印檔", async ({ page, request }, info) => {
    // 先用 API 建一筆訂單
    const pub = await request.post("/api/orders", {
      data: {
        code: st.code,
        frameNo: st.frames[0],
        spec: { orientation: "portrait", crop: { x: 0.3, y: 0, w: 0.44, h: 0.8 }, tone: "color", frame: "polaroid", paper: "cream", caption: "訂單測試", finish: "glossy" },
        guestName: `訂單 ${info.project.name}`,
        note: "請用霧面",
      },
    });
    expect(pub.ok()).toBeTruthy();
    const { shortCode } = (await pub.json()) as { shortCode: string };

    await loginUi(page);
    await page.goto("/admin/orders");
    await expect(page.locator(".tbl")).toContainText(shortCode);
    await shot(page, info.project.name, "24-orders");
    const row = page.locator(".tbl tbody tr", { hasText: shortCode });
    await row.click();
    await page.waitForURL(/\/admin\/orders\/[^/]+$/);
    await expect(page.getByRole("heading", { name: shortCode })).toBeVisible();
    await expect(page.locator(".proof .hand")).toContainText("訂單測試");
    await expect(page.locator(".kv").first()).toContainText("拍立得 · 米白");
    await expect(page.locator(".kv").nth(1)).toContainText("請用霧面");
    await shot(page, info.project.name, "25-order-detail");
    // 列印檔
    const href = await page.getByRole("link", { name: "下載 PNG" }).getAttribute("href");
    const ctx = await adminApi();
    const png = await ctx.get(href!);
    expect(png.ok()).toBeTruthy();
    expect(png.headers()["content-type"]).toContain("image/png");
    const body = await png.body();
    expect(body.length).toBeGreaterThan(20_000);
    expect(body.subarray(16, 24).readUInt32BE(0)).toBe(1200);
    expect(body.subarray(16, 24).readUInt32BE(4)).toBe(1800);
    await ctx.dispose();
    await page.getByRole("button", { name: "重新產生" }).click();
    await expect(page.locator(".toast")).toContainText("重新產生");
    // 狀態
    await page.getByRole("button", { name: /標記已列印/ }).click();
    await expect(page.locator(".head .status")).toHaveText("已列印");
    await page.getByRole("button", { name: /標記已交付/ }).click();
    await expect(page.locator(".head .status")).toHaveText("已交付");
    await page.waitForLoadState("networkidle");
    await page.goto("/admin/orders?status=delivered");
    await expect(page.locator(".tbl")).toContainText(shortCode);
    // 批次：退回成已列印後批次標記已交付
    await page.goto("/admin/orders?status=printed");
    const ctx2 = await adminApi();
    const id = href!.split("/")[4];
    await ctx2.patch(`/api/admin/orders/${id}`, { data: { status: "printed" } });
    await ctx2.dispose();
    await page.reload();
    await page.locator(".tbl tbody tr", { hasText: shortCode }).locator("label.chk").click();
    await expect(page.locator(".batch")).toContainText("已選 1 筆");
    await page.getByRole("button", { name: "標記已交付" }).click();
    await expect(page.locator(".toast")).toContainText("已交付");
  });

  test("設定：校正值與檢查清單", async ({ page }, info) => {
    await loginUi(page);
    await page.goto("/admin/settings");
    await expect(page.locator(".safe-preview")).toBeVisible();
    for (const k of ["上", "右", "下", "左"]) {
      await page.getByLabel(`${k} mm`).fill("2.5");
    }
    await page.getByLabel("左 mm").blur();
    await expect(page.locator(".toast")).toContainText("校正數值已儲存");
    await expect(page.locator(".sect", { hasText: "校正" }).first()).toContainText("已校正");
    await page.getByText("無邊框列印：開").click();
    await expect(page.locator(".toast")).toContainText("清單已更新");
    await shot(page, info.project.name, "26-settings");
    // 校正後訪客編輯器不再顯示「尚未校正」
    if (!isMobile(page)) {
      await page.goto(`/a/${st.code}/f/${st.frames[0]}/edit`);
      await expect(page.getByText("尚未校正")).toHaveCount(0);
    }
    // 校正圖可下載
    const ctx = await adminApi();
    const r = await ctx.get("/api/admin/calibration");
    expect(r.headers()["content-type"]).toContain("image/png");
    await ctx.dispose();
  });

  test("登出後無法進入", async ({ page }) => {
    await loginUi(page);
    await page.getByRole("button", { name: "登出" }).click();
    await page.waitForURL(/\/admin\/login/);
    await page.goto("/admin/albums");
    await page.waitForURL(/\/admin\/login/);
  });
});
