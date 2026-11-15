import { test, expect, type Page } from "@playwright/test";
import { readState, shot, swipe } from "./helpers";

const st = readState();
const isMobile = (p: Page) => (p.viewportSize()?.width ?? 1440) < 640;

test.describe("訪客流程", () => {
  test("書架：錯誤代碼顯示提示，正確代碼翻開相簿並記在書架", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("把回憶印成一張");
    await shot(page, info.project.name, "01-shelf-empty");
    await page.getByLabel("代碼").fill("nope-nope");
    await page.getByRole("button", { name: /翻開/ }).click();
    await expect(page.getByText("找不到這本")).toBeVisible();
    await page.getByLabel("代碼").fill(st.code);
    await page.getByRole("button", { name: /翻開/ }).click();
    await page.waitForURL(new RegExp(`/a/${st.code}`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(st.title);
    await expect(page.locator("#guide")).toContainText("點一張你想印的");
    await expect(page.locator(".film .fr")).toHaveCount(3);
    await expect(page.locator(".spread .fig")).toHaveCount(3);
    await page.waitForTimeout(600);
    await shot(page, info.project.name, "02-album-pages");
    // 書架記住了
    await page.goto("/");
    await expect(page.locator(".albumrow")).toHaveCount(1);
    await expect(page.locator(".albumrow .d2")).toContainText(st.title);
    await shot(page, info.project.name, "03-shelf-with-album");
  });

  test("相簿：印樣模式切換並被記住", async ({ page }, info) => {
    await page.goto(`/a/${st.code}`);
    await page.getByRole("radio", { name: "印樣" }).click();
    await page.waitForURL(/mode=sheet/);
    await expect(page.locator(".sheet .cell")).toHaveCount(3);
    await shot(page, info.project.name, "04-album-sheet");
    await page.goto(`/a/${st.code}`);
    await page.waitForURL(/mode=sheet/);
    await page.getByRole("radio", { name: "翻頁" }).click();
    await page.waitForURL((u) => !u.search.includes("mode="));
    await expect(page.locator(".spread .fig").first()).toBeVisible();
  });

  test("關閉或不存在的相簿", async ({ page }, info) => {
    await page.goto("/a/nope-nope");
    await expect(page.getByText("這本已經收起來了")).toBeVisible();
    await shot(page, info.project.name, "05-closed");
  });

  test("詳情：翻張、全螢幕", async ({ page }, info) => {
    await page.goto(`/a/${st.code}/f/${st.frames[0]}`);
    await expect(page.locator(".topbar .frame")).toHaveText(st.frames[0]);
    await expect(page.locator(".detail .big img")).toBeVisible();
    await shot(page, info.project.name, "06-detail", false);
    if (isMobile(page)) {
      // 手機：左右滑
      const img = (await page.locator(".detail .big img").boundingBox())!;
      await swipe(page, ".detail", { x: img.x + img.width * 0.8, y: img.y + img.height / 2 }, { x: img.x + img.width * 0.2, y: img.y + img.height / 2 });
      await page.waitForURL(new RegExp(`/f/${st.frames[1]}`));
    } else {
      await page.keyboard.press("ArrowRight");
      await page.waitForURL(new RegExp(`/f/${st.frames[1]}`));
      await page.getByRole("link", { name: "上一張" }).click();
      await page.waitForURL(new RegExp(`/f/${st.frames[0]}`));
    }
    // 全螢幕
    await page.getByRole("button", { name: "全螢幕" }).click();
    await expect(page.locator(".fs")).toBeVisible();
    await page.waitForTimeout(400);
    await shot(page, info.project.name, "07-fullscreen", false);
    if (isMobile(page)) await page.getByRole("button", { name: "退出全螢幕" }).click();
    else await page.keyboard.press("Escape");
    await expect(page.locator(".fs")).toHaveCount(0);
    // 窄底片在
    await expect(page.locator(".film.thin .fr")).toHaveCount(3);
  });

  test("編輯器：所有控制項即時反映在相紙上，設定會記住", async ({ page }, info) => {
    await page.goto(`/a/${st.code}/f/${st.frames[0]}`);
    await page.getByRole("button", { name: "印這一張" }).click();
    await page.waitForURL(/\/edit$/);
    const proof = page.locator(".proof");
    await expect(proof).toBeVisible();
    await expect(page.locator(".proof .area img")).toBeVisible();
    // 預設：橫式照片 → 橫式、拍立得、白
    const w0 = (await proof.boundingBox())!;
    expect(w0.width).toBeGreaterThan(w0.height);
    await expect(page.getByRole("radio", { name: "橫式" })).toHaveAttribute("aria-checked", "true");
    await shot(page, info.project.name, "08-editor-default", !isMobile(page));
    // 方向
    await page.getByRole("radio", { name: "直式" }).click();
    const w1 = (await proof.boundingBox())!;
    expect(w1.height).toBeGreaterThan(w1.width);
    // 色調
    await page.getByRole("radio", { name: "黑白" }).click();
    await expect(page.locator(".proof .area")).toHaveClass(/bw/);
    // 框：無 → 紙色消失；一句話仍可寫，會壓在照片上
    await page.getByRole("radio", { name: "無" }).click();
    await expect(page.locator(".dots")).toHaveCount(0);
    await page.locator("#caption").fill("壓在照片上");
    await expect(page.locator(".proof .hand.on-photo")).toContainText("壓在照片上");
    // 框：細框 → 紙色在、文字仍在照片上
    await page.getByRole("radio", { name: "細框" }).click();
    await expect(page.locator(".dots")).toBeVisible();
    await expect(page.locator(".proof .hand.on-photo")).toBeVisible();
    // 框：拍立得 → 一句話預設回到相紙下方；往上拖到照片上會變成壓在照片上的樣式
    await page.getByRole("radio", { name: "拍立得" }).click();
    await page.locator("#caption").fill("民宿的窗，想留著");
    await expect(page.locator(".proof .hand")).toContainText("民宿的窗，想留著");
    await expect(page.locator(".proof .hand.on-photo")).toHaveCount(0);
    await expect(page.locator(".line .cnt")).toContainText("8 / 30");
    {
      const hb0 = (await page.locator(".proof .hand").boundingBox())!;
      await page.mouse.move(hb0.x + hb0.width / 2, hb0.y + hb0.height / 2);
      await page.mouse.down();
      await page.mouse.move(hb0.x + hb0.width / 2, hb0.y + hb0.height / 2 - 120, { steps: 8 });
      await page.mouse.up();
      await expect(page.locator(".proof .hand.on-photo")).toBeVisible();
      // 拖回下帶
      const hb1 = (await page.locator(".proof .hand").boundingBox())!;
      await page.mouse.move(hb1.x + hb1.width / 2, hb1.y + hb1.height / 2);
      await page.mouse.down();
      await page.mouse.move(hb1.x + hb1.width / 2, hb1.y + hb1.height / 2 + 120, { steps: 8 });
      await page.mouse.up();
      await expect(page.locator(".proof .hand.on-photo")).toHaveCount(0);
    }
    // 一句話可以拖曳移動
    const hand = page.locator(".proof .hand");
    const hb = (await hand.boundingBox())!;
    const posBefore = await hand.evaluate((el) => (el as HTMLElement).style.left);
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 - 40, hb.y + hb.height / 2 - 6, { steps: 5 });
    await page.mouse.up();
    expect(await hand.evaluate((el) => (el as HTMLElement).style.left)).not.toBe(posBefore);
    // 大小：滑桿連續調整；桌機在字上滾滾輪也會變
    const fs0 = await hand.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    await page.locator("#capSize").fill("6");
    const fs1 = await hand.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fs1).toBeGreaterThan(fs0 * 1.5);
    if (info.project.name.startsWith("desktop")) { // 觸控版 WebKit 不支援滑鼠滾輪
      const hb2 = (await hand.boundingBox())!;
      await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(100);
      const fs2 = await hand.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fs2).toBeLessThan(fs1);
    }
    await page.locator("#capSize").fill("3.2");
    // 旋轉：滑桿改角度，相紙上的字跟著轉；歸零
    await page.locator("#capRotate").fill("20");
    expect(await hand.evaluate((el) => (el as HTMLElement).style.transform)).toContain("rotate(20deg)");
    await page.locator("#capRotate").fill("180");
    expect(await hand.evaluate((el) => (el as HTMLElement).style.transform)).toContain("rotate(180deg)");
    await page.locator("#capRotate").fill("-135");
    expect(await hand.evaluate((el) => (el as HTMLElement).style.transform)).toContain("rotate(-135deg)");
    await page.getByRole("button", { name: "歸零" }).click();
    expect(await hand.evaluate((el) => (el as HTMLElement).style.transform)).toContain("rotate(0deg)");
    // 顏色：色票 → 相紙上的字變色；自動 → 回到墨色
    await page.getByRole("radio", { name: "朱砂" }).click();
    expect(await hand.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(196, 48, 43)");
    await page.getByRole("radio", { name: "自動" }).click();
    expect(await hand.evaluate((el) => getComputedStyle(el).color)).not.toBe("rgb(196, 48, 43)");
    // 邊界：往四個方向拖到底，文字框離紙邊都至少 7.5 mm（安全區 8 mm，量測含字框誤差）
    for (const [dx, dy] of [[-900, 0], [900, 0], [0, -900], [0, 900]]) {
      const b0 = (await hand.boundingBox())!;
      await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
      await page.mouse.down();
      await page.mouse.move(b0.x + b0.width / 2 + dx, b0.y + b0.height / 2 + dy, { steps: 8 });
      await page.mouse.up();
      const d = await page.evaluate(() => {
        const paper = document.querySelector(".proof")!.getBoundingClientRect();
        const el = document.querySelector(".proof .hand")!;
        // 只量文字節點，不含縮放用的小點
        let t: DOMRect | null = null;
        for (const n of [...el.childNodes]) {
          if (n.nodeType !== Node.TEXT_NODE && !(n as HTMLElement).classList?.contains("last")) continue;
          const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
          if (!b.width) continue;
          t = t ? new DOMRect(Math.min(t.left, b.left), Math.min(t.top, b.top), Math.max(t.right, b.right) - Math.min(t.left, b.left), Math.max(t.bottom, b.bottom) - Math.min(t.top, b.top)) : b;
        }
        t = t!;
        const mm = paper.width / (paper.width > paper.height ? 148 : 100);
        return [(t.left - paper.left) / mm, (paper.right - t.right) / mm, (t.top - paper.top) / mm, (paper.bottom - t.bottom) / mm];
      });
      for (const v of d) expect(v).toBeGreaterThanOrEqual(7.5);
    }
    // 紙色：米白
    await page.getByRole("radio", { name: "米白" }).click();
    const bg = await proof.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg.replace(/\s/g, "")).toBe("rgb(243,236,221)");
    // 拖曳裁切改變位移
    const area = page.locator(".proof .area");
    const before = await area.locator("img").evaluate((el) => (el as HTMLElement).style.transform);
    const ab = (await area.boundingBox())!;
    if (isMobile(page)) {
      await swipe(page, ".proof .area", { x: ab.x + ab.width / 2, y: ab.y + ab.height / 2 }, { x: ab.x + ab.width / 2 - 40, y: ab.y + ab.height / 2 - 30 });
    } else {
      await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2);
      await page.mouse.down();
      await page.mouse.move(ab.x + ab.width / 2 - 60, ab.y + ab.height / 2 - 40, { steps: 6 });
      await page.mouse.up();
    }
    const after = await area.locator("img").evaluate((el) => (el as HTMLElement).style.transform);
    expect(after).not.toBe(before);
    await shot(page, info.project.name, "09-editor-edited", !isMobile(page));
    // 重新整理後設定還在
    await page.reload();
    await expect(page.locator(".proof .hand")).toContainText("民宿的窗，想留著");
    await expect(page.getByRole("radio", { name: "黑白" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("上次的設定").locator("visible=true")).toBeVisible();
  });

  test("編輯器：低解析度照片顯示警告，放大到極限會阻擋", async ({ page }, info) => {
    await page.goto(`/a/${st.code}/f/${st.frames[2]}/edit`);
    await expect(page.locator(".alert.warn").locator("visible=true")).toContainText("解析度偏低");
    const area = page.locator(".proof .area");
    await area.focus();
    for (let i = 0; i < 20; i++) await page.keyboard.press("+");
    await expect(page.locator(".alert.err").locator("visible=true")).toContainText("無法列印");
    const next = page.locator(".btn", { hasText: "下一步" }).locator("visible=true").first();
    await expect(next).toBeDisabled();
    await shot(page, info.project.name, "10-editor-blocked", !isMobile(page));
    await page.keyboard.press("0");
    await expect(page.locator(".alert.err").locator("visible=true")).toHaveCount(0);
    await expect(next).toBeEnabled();
  });

  test("確認與送出：名字必填，成功頁蓋章，之後標示已印過", async ({ page }, info) => {
    await page.goto(`/a/${st.code}/f/${st.frames[1]}/edit`);
    await page.getByRole("radio", { name: "拍立得" }).click();
    await page.locator("#caption").fill("E2E 一句話");
    await page.locator(".btn", { hasText: "下一步" }).locator("visible=true").first().click();
    await page.waitForURL(/\/confirm$/);
    await expect(page.getByRole("heading", { name: "確認這一張" })).toBeVisible();
    await expect(page.locator(".sum")).toContainText("E2E 一句話");
    await expect(page.locator(".sum")).toContainText("1 張");
    await shot(page, info.project.name, "11-confirm", !isMobile(page));
    // 名字空白
    await page.locator("#guest").fill("");
    await page.locator(".btn", { hasText: "送出列印需求" }).locator("visible=true").first().click();
    await expect(page.getByText("要留個名字")).toBeVisible();
    await page.locator("#guest").fill(`小芸 ${info.project.name}`);
    await page.locator("#note").fill("下次見面拿");
    await page.locator(".btn", { hasText: "送出列印需求" }).locator("visible=true").first().click();
    await page.waitForURL(/\/done\//);
    await expect(page.getByRole("heading", { name: "收到了" })).toBeVisible();
    await expect(page.locator(".stamp")).toContainText("傑");
    await expect(page.locator(".mono-sm", { hasText: "ORDER" })).toContainText(/ORDER \d{4}-\d{4}-\d{2}/);
    await page.waitForTimeout(1400);
    await shot(page, info.project.name, "12-done");
    // 返回鍵不會回到確認頁
    await page.goBack();
    await expect(page).not.toHaveURL(/\/confirm$/);
    // 詳情頁標示已印過（桌機顯示文字；手機隱藏文字但底片有圈）
    await page.goto(`/a/${st.code}/f/${st.frames[1]}`);
    if (!isMobile(page)) await expect(page.getByText("印過這張")).toBeVisible();
    await expect(page.locator(".film .fr.printed")).toHaveCount(1);
    await page.goto(`/a/${st.code}`);
    await expect(page.locator(".film .fr.printed")).toHaveCount(1);
    await shot(page, info.project.name, "13-album-after-order");
  });

  test("鍵盤與無障礙：焦點可見、底片可用方向鍵", async ({ page }) => {
    test.skip(isMobile(page), "手機沒有鍵盤導覽");
    await page.goto(`/a/${st.code}`);
    const first = page.locator(".film .fr").first();
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".film .fr").nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.locator(".film .fr").nth(2)).toBeFocused();
    const outline = await page.locator(".film .fr").nth(2).evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });
});
