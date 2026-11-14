# Jay's Print Room

一間個人的線上照片沖印工作室。朋友用專屬代碼翻開相簿，挑一張，調整裁切、框、紙色與一句話，送出後由你用 Canon SELPHY CP1500 印在 100 × 148 mm 相紙上。

設計依據：`DESIGN_SYSTEM.md`（唯一來源）。

## 本機開發

```bash
pnpm install
cp .env.example .env.local   # 預設即可：本機檔案儲存 + SQLite
pnpm dev
```

- 訪客：http://localhost:3000
- 管理：http://localhost:3000/admin （預設密碼 `print`，在 `.env.local` 的 `ADMIN_PASSWORD` 改）
- 資料與照片在 `./data/`（已被 git 忽略）

流程：管理端建相簿 → 上傳照片 → 相簿設為「可見」→ 複製連結傳給朋友。

## 架構

| 層 | 實作 |
|---|---|
| 前端 / API | Next.js 16（App Router、Route Handlers、`proxy.ts` 保護 `/admin`） |
| 資料庫 | Drizzle + libsql：本機 `file:`，上線 Turso |
| 儲存 | `src/lib/storage`：`local`（磁碟）或 `r2`（Cloudflare R2，瀏覽器直傳） |
| 圖片 | sharp 產生 480 / 960 / 1440 / 2048 WebP；HEIC 以 heic-convert 轉檔；原檔逐位元保存 |
| 列印檔 | `src/lib/images/print.ts`：原檔 → 裁切 → Lanczos → 合成框與一句話（resvg + 霞鶩文楷）→ PNG sRGB 300 dpi |
| 規格常數 | `src/lib/print-spec.ts`，前端相紙預覽（`components/Proof.tsx`）與後端共用 |

## 部署（Vercel + R2 + Turso，皆有免費額度）

1. **Turso**：建立資料庫，取得 `libsql://...` URL 與 token。
2. **Cloudflare R2**：建立 bucket（例如 `printly`），開啟公開存取（r2.dev 或自訂網域）作為 `R2_PUBLIC_BASE`，建立 API token 取得 access key。在 bucket 的 CORS 設定允許你的網域 `PUT`（瀏覽器直傳需要）。
3. **Vercel**：匯入此 repo，設定環境變數：
   ```
   STORAGE_DRIVER=r2
   DATABASE_URL=libsql://xxx.turso.io
   DATABASE_AUTH_TOKEN=...
   ADMIN_PASSWORD=（長一點）
   SESSION_SECRET=（隨機 32 字以上）
   SITE_URL=https://你的網域
   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE
   ```
4. 部署後到 `/admin/settings` 下載校正圖印一張，量四邊被裁掉的毫米數填回去。

## 列印

管理端訂單頁下載 PNG，用電腦列印。印表機驅動固定：紙張 Postcard 100 × 148、無邊框、不縮放（100%）、關閉影像最佳化與自動修正。表面（光面 / 霧面）依訂單上的設定在印表機切換。

## 指令

```bash
pnpm dev          # 開發
pnpm build        # 正式建置
pnpm lint         # ESLint
pnpm exec tsc --noEmit
```

## 端對端測試（Playwright）

```bash
pnpm exec playwright install chromium firefox webkit   # 第一次
pnpm test:e2e                                          # 六種裝置：桌機 Chrome / Firefox / Safari、iPhone 13、Pixel 5、iPad Mini
pnpm exec playwright test --project=iphone-13          # 只跑一種
pnpm exec playwright show-report test-results/html     # 看報告
```

測試會透過 API 自動建立一本「E2E …」相簿與訂單，擷圖存在 `test-results/screens/<裝置>/`。macOS 12 需使用 Playwright 1.48（已鎖定）。
