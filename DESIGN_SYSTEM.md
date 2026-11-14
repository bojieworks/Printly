# Jay's Print Room — Design System

版本 1.1 · 2026-11-14（原型回饋後更新 3.7、3.10）
狀態：已確認，為後續開發的唯一設計依據。

本文件記錄數值與規格。判斷與理由在 Art Direction（Phase 4）；結構與流程在 UX Architecture（Phase 5）。
三份文件衝突時，以本文件為準，並回頭修正另外兩份。

探索紀錄（claude.ai artifacts，私人連結）：
- Phase 2 設計方向：https://claude.ai/artifact/TVrjXbEo7dUStaE5DVoiAw
- Phase 3 視覺探索：https://claude.ai/artifact/399iKmhNpAD8kFD7ybmpiS
- Phase 4 Art Direction：https://claude.ai/artifact/JT2UY16jMY9Z6QRjSzhtGT
- Phase 5 UX Architecture：https://claude.ai/artifact/UAZWxJY6qYoknw2Ar5GVmo
- 相框示意：https://claude.ai/artifact/SZ3tuN7qLooZsKaBDxNNo6

---

## 0. 快速索引

1. Foundation：品牌、原則、色彩、字體、間距、圓角、線、陰影、層級、斷點
2. Print Spec：相紙、框、安全區、像素（印表機限制的落地數值）
3. Components：所有元件的規格與狀態
4. Interaction：hover、active、focus、disabled、loading、transition、motion
5. Responsive：四個斷點各自的規則
6. Accessibility：鍵盤、焦點、對比、讀屏、觸控
7. Content：口吻與文案規則
8. Implementation notes：token 落地、字體載入、圖片管線

---

## 1. Foundation

### 1.1 Brand Concept

一句話：**這是一本你親手編的寫真集。朋友翻到喜歡的那一頁，把照片取下來，貼在一張 100 × 148 mm 的相紙上，寫一句話，交給你。**

三個來源的混合：
- 寫真集（主體）：紙白、留白、翻頁、圖說、朱紅印章。
- 校樣（編輯器與管理端）：真實比例、安全區、毫米、工作單。
- 暗房（一個物件、一個動效）：底片作為索引，顯影作為成功。

工作室名：Jay's Print Room。印章字：傑。

### 1.2 Design Principles

1. **照片先說話。** 介面永遠排在照片後面。任何與照片爭奪注意力的元素都拿掉。
2. **紙，不是螢幕。** 背景是紙、分隔是摺線、按鈕是墨。沒有玻璃、漸層、發光、圓角。
3. **每個裝飾都有工作。** 底片是索引，印章是確認，格號是識別。沒有工作的裝飾不存在。
4. **一次只做一件事。** 一頁一個主要動作。流程是翻開、挑一張、調整、確認。
5. **誠實於實物。** 預覽以真實比例呈現，標示安全區，提示解析度。螢幕不承諾紙做不到的事。

### 1.3 Color Tokens

單一亮色主題。不做深色主題；唯一的深色物件是底片，唯一的深色滿版是全螢幕。

```css
:root {
  /* 紙 */
  --paper:      #F8F6F1;  /* 頁面底色 */
  --paper-2:    #F1EEE7;  /* 編輯器舞台、表頭、禁用底 */
  --sheet:      #FFFFFF;  /* 只給相紙與輸入框 */

  /* 墨與鉛筆 */
  --ink:        #1C1B19;  /* 標題、主按鈕、強分隔線 */
  --ink-2:      #4A4741;  /* 內文、圖說 hover */
  --pencil:     #7D776C;  /* 次要文字、頁碼、未選選項 */

  /* 摺線 */
  --rule:       #DDD8CD;  /* 一般分隔線 */
  --rule-2:     #C9C3B6;  /* 輸入框、色票外框 */

  /* 底片（只在底片條內使用） */
  --film:       #1B1917;
  --film-2:     #272320;  /* 齒孔 */
  --film-fg:    #EFE8DC;
  --film-mute:  #9B9185;  /* 未選格號 */
  --amber:      #E3A04F;  /* 目前格、hover 格號。永遠不出現在紙上 */

  /* 暗房（只在全螢幕） */
  --black:      #0D0C0B;

  /* 朱印：全站唯一彩色 */
  --vermilion:   #C4302B; /* 選取圈、印章、焦點環、安全區線 */
  --vermilion-2: #A7271F; /* hover / active */

  /* 功能色 */
  --ok:      #3E7A5A;  --ok-bg:   #E9F0EA;  --ok-fg:   #24503A;
  --warn:    #B8862B;  --warn-bg: #F6EFDF;  --warn-fg: #6A4D12;
  --err:     #A12F23;  --err-bg:  #F4E3E0;  --err-fg:  #6F1F17;
}
```

**使用規則**
- 彩色只有朱紅與功能色。功能色只用於狀態訊息，不用於裝飾。
- `--amber` 只能出現在 `--film` 背景上。`--black` 只能出現在全螢幕覆蓋層。
- 文字只用 `--ink`、`--ink-2`、`--pencil` 三階；不自創灰色。
- 紙色（相框用）另見 2.4，它們是「列印內容」，不是 UI token。

**對比（WCAG）**

| 組合 | 對比 | 允許用途 |
|---|---|---|
| ink / paper | 15.4 | 所有文字 |
| ink-2 / paper | 8.9 | 內文、圖說 |
| pencil / paper | 4.6 | 次要文字，字級 ≥ 12px 且非主要資訊 |
| vermilion / paper | 5.4 | 焦點環、選取標記、警示文字 |
| paper / ink | 15.4 | 主按鈕文字 |
| amber / film | 8.2 | 底片格號 |
| film-mute / film | 5.6 | 未選格號，字級 ≥ 11px |
| warn-fg / warn-bg | 7.1 | 警告文字 |
| err-fg / err-bg | 8.4 | 錯誤文字 |

### 1.4 Typography Tokens

```css
:root {
  --f-serif: 'Noto Serif TC', 'Songti TC', 'PMingLiU', serif;          /* 中文標題、story */
  --f-sans:  'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif; /* 介面、內文 */
  --f-latin: 'EB Garamond', Georgia, 'Times New Roman', serif;          /* 英文副題、頁碼、工作室名 */
  --f-hand:  'LXGW WenKai TC', 'Kaiti TC', 'DFKai-SB', serif;           /* 圖說、訪客手寫 */
  --f-mono:  'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace; /* 格號、尺寸、資料 */
}
```

**字級表**（桌機 / 手機；行高；字距；字重）

| Token | 字體 | 桌機 | 手機 | lh | ls | 字重 | 用途 |
|---|---|---|---|---|---|---|---|
| `display-1` | serif | 44 | 36 | 1.2 | .02em | 600 | 頁面主標，一頁一個；管理端不用 |
| `display-2` | serif | 32 | 26 | 1.25 | .02em | 600 | 相簿列標題、區段標題、管理端最大 |
| `title` | serif | 22 | 20 | 1.4 | .02em | 600 | 對話框標題、確認頁小標 |
| `latin-italic` | latin italic | 24 | 20 | 1.3 | 0 | 400 | 跟在中文標題後的英文副題 |
| `latin` | latin | 15 / 12 | 13 / 12 | 1.5 | .02em | 400 / 500 | 工作室名（500）、頁碼（400） |
| `story` | serif | 15 | 15 | 2.0 | 0 | 400 | 你寫給朋友的話 |
| `body` | sans | 16 | 15 | 1.8 | 0 | 400 | 系統說明、管理端內文 |
| `body-sm` | sans | 14 | 14 | 1.6 | 0 | 400 | 管理端表格、說明 |
| `caption` | hand | 14 | 13 | 1.7 | 0 | 400 | 圖說、訪客的一句話；只能出現在照片或相紙旁 |
| `label` | sans | 12 | 12 | 1.5 | .2em | 500 | 選項、按鈕、表單標籤；≤ 6 字 |
| `mono` | mono | 12 | 12 | 1.6 | .08em | 400 / 500 | 格號、尺寸、日期、訂單號 |
| `mono-sm` | mono | 11 | 11 | 1.5 | .1em | 400 | 底片格號、頂列右側資料 |
| `vertical` | serif | 13 | 12 | — | .3em | 400 | 直排日期，`writing-mode: vertical-rl` |

**混排規則**
- 中文與英文、數字之間加四分之一空（`text-autospace: ideograph-alpha ideograph-numeric` 可用時啟用，否則手動半形空白）。
- 數字一律 `font-variant-numeric: tabular-nums`。
- 等寬資料以 ` · ` 分隔。日期資料層用 `2026-08-14`，直排用「二〇二六年八月」。
- 標題 `text-wrap: balance`。內文最大行寬 44em（中文約 44 字）。
- 字體載入：Google Fonts，`display=swap`；中文字體以 `unicode-range` 分段與子集化；首屏不等字體。訪客頁只載 serif、sans、hand；管理端只載 sans、mono；latin 與 mono 體積小，兩邊都載。

### 1.5 Spacing Scale

基準 4。只有這十個值。

```css
:root {
  --s1: 4px;  --s2: 8px;  --s3: 12px; --s4: 16px; --s5: 24px;
  --s6: 32px; --s7: 48px; --s8: 64px; --s9: 96px; --s10: 128px;
}
```

| Token | 用在 |
|---|---|
| s1 | 圖標與文字間、外框偏移 |
| s2 | 圖說與照片間、按鈕內字與箭頭、相紙與圖說 |
| s3 | 按鈕上下內距、表單標籤到欄位 |
| s4 | 手機邊距、列內距、底片格間距（完整 6px 例外見 3.7） |
| s5 | 桌機欄距、翻頁模式照片間距、按鈕左右內距 |
| s6 | 段落間、工作單列與列 |
| s7 | 桌機邊距、區塊間、照片上方 |
| s8 | 頁面主區塊間 |
| s9 | 首頁相簿列之間、章節間 |
| s10 | 只用在成功頁上下留白 |

節奏規則：同一頁最多三種間距大小。垂直間距落在 8px 基線網格。照片上方的空間永遠比下方大（例如 48 上、24 下）。

### 1.6 Border Radius

```css
:root { --radius: 0; }
```

零圓角。例外只有兩個：紙色圓點（`border-radius: 50%`）與手繪選取圈（不規則橢圓，見 3.7）。

### 1.7 Border Styles

| Token | 樣式 | 用途 |
|---|---|---|
| `rule` | 1px solid var(--rule) | 列表分隔、頂列底線、欄之間 |
| `rule-2` | 1px solid var(--rule-2) | 輸入框、色票外框、相框選擇器 |
| `ink-top` | 2px solid var(--ink) | 區段開始（首頁每本相簿、管理端表格頂）；一頁最多三條 |
| `ink-line` | 1px solid var(--ink) | 底線式輸入、文字按鈕、選項選中底線 |
| `safe` | 1px dashed var(--vermilion) | 安全區，只在編輯器 |
| `focus` | 2px solid var(--vermilion), offset 3px | 焦點環 |
| `sprocket` | repeating-linear-gradient(90deg, var(--film-2) 0 10px, transparent 10px 22px) | 底片齒孔，高 6px（窄底片 4px，週期 6/14） |

規則：橫線多於直線；兩欄之間用一條直線或一欄空白，不同時用；沒有卡片，想畫封閉框時先用頂線加留白取代。例外：輸入框、相紙、框選擇器的小相紙。

### 1.8 Shadows

```css
:root {
  --shadow-proof: 0 1px 2px rgba(28,27,25,.08), 0 16px 32px rgba(60,50,30,.14); /* 相紙 */
  --shadow-proof-sm: 0 1px 2px rgba(28,27,25,.08), 0 10px 20px rgba(60,50,30,.12); /* 手機相紙 */
  --shadow-lift: 0 18px 30px rgba(60,50,30,.22); /* 抬起動效的終點 */
}
```

相紙是全站唯一有陰影的物件。照片、按鈕、頂列、Toast 都沒有陰影。

### 1.9 Z-index

```css
:root {
  --z-base: 0;
  --z-film: 10;      /* 固定底部的窄底片 */
  --z-actionbar: 20; /* 手機固定底部動作列 */
  --z-topbar: 30;    /* 手機固定頂列 */
  --z-toast: 40;
  --z-sheet: 50;     /* 管理端 ConfirmSheet */
  --z-fullscreen: 60;
}
```

### 1.10 Breakpoints

```css
/* mobile  : < 640px  */
/* tablet  : 640–1023px */
/* desktop : 1024–1439px */
/* large   : ≥ 1440px */
```

| | mobile | tablet | desktop | large |
|---|---|---|---|---|
| 欄數 | 4 | 8 | 12 | 12 |
| 欄距 | 16 | 24 | 24 | 24 |
| 邊距 | 20 | 32 | 48 | 48 |
| 內容最寬 | — | — | 1280 | 1280（置中，兩側留白） |
| 頂列高 | 48 固定 | 52 | 52 | 52 |

---

## 2. Print Spec

印表機：Canon SELPHY CP1500，明信片相紙 100 × 148 mm，300 dpi，熱昇華，永遠以無邊框模式列印。

### 2.1 常數（毫米）

```js
export const PAPER = { w: 100, h: 148 };              // mm
export const OUTPUT_PX = { w: 1200, h: 1800 };        // 輸出檔像素（4×6 in @300dpi）
export const PX_PER_MM = OUTPUT_PX.w / PAPER.w;       // 12
export const BLEED_DEFAULT = { top: 3, right: 3, bottom: 3, left: 3 }; // mm，校正後以 Settings.calibration 覆寫
export const SAFE_INSET = 8;                           // mm，文字與重要內容離紙邊的最小距離
export const FRAME = {
  none:     { top: 0, right: 0, bottom: 0, left: 0 },
  thin:     { top: 6, right: 6, bottom: 6, left: 6 },
  polaroid: { top: 6, right: 6, bottom: 22, left: 6 },
};
export const CAPTION = { fontSizeMm: 3.2, baselineFromBottomMm: 9, maxChars: 30 }; // 只在 polaroid
export const MIN_PX = { ok: [1200, 1800], warn: [800, 1200] };  // 裁切後有效像素門檻（短邊, 長邊）
```

### 2.2 裁切比例（依框而定）

| 框 | 照片區域 mm | 比例 |
|---|---|---|
| none | 100 × 148 | 100 : 148 |
| thin | 88 × 136 | 88 : 136 |
| polaroid | 88 × 120 | 88 : 120 |

改框時裁切框即時重算，保持原來的中心點與縮放比例。方向為橫式時，上表寬高互換，拍立得的寬帶仍在下方。

### 2.3 相紙的合成順序（前端預覽與後端列印檔共用）

1. 紙色填滿整張。
2. 依框算出照片區域，放入裁切後的照片（tone 套用於此）。
3. 拍立得時在下帶寫入一句話：`--f-hand`，置中，字高 3.2 mm，基線距底 9 mm，超過寬度縮小至 2.6 mm 後截斷。
4. 編輯器額外疊安全區虛線（內縮 3%）與裁切標記；確認頁、成功頁、管理端不疊。

### 2.4 紙色（列印內容，可在管理端設定）

| key | 預設色碼 | 名稱 |
|---|---|---|
| white | #FFFFFF | 白 |
| cream | #F3ECDD | 米白 |
| black | #2A2724 | 黑 |
| sage | #8A9A7B | 灰綠 |
| tea | #C9A68A | 淺茶 |

黑紙上的一句話用 `#EFE8DC`，其餘紙色用 `#3A362F`。

### 2.5 輸出檔

- 格式 PNG，1200 × 1800（直式）或 1800 × 1200（橫式），sRGB，寫入 300 dpi 的 pHYs。
- 原檔先套 Exif 方向，Display P3 或其他 ICC 轉換到 sRGB（不是移除）。
- 縮放用 Lanczos。黑白用亮度加權（Rec. 709）。
- 一句話用與網頁相同的字體檔繪製。
- 印表機驅動固定：無邊框、不縮放（100%）、關閉影像最佳化與色彩修正、紙張選 Postcard 100×148。此清單在管理端設定頁。

---

## 3. Components

命名以紙上的名字為準。每個元件列出：結構、尺寸、狀態、禁止事項。

### 3.1 Button

| 變體 | 底 | 字 | 框 | 用途 |
|---|---|---|---|---|
| primary | ink | paper | ink | 一頁一個，流程前進位置 |
| secondary | transparent | ink | ink | 後退、取消 |
| text | transparent | ink | 底線 ink | 不改變流程的動作：換一張、全螢幕 |
| danger | transparent | err | err | 管理端刪除；二次確認後才變 err 實心 |

- 尺寸：md 高 44、內距 12 24 12 22（左多 2px 補償字距）；sm 高 40、內距 9 16 9 14；手機 primary 高 52、滿寬。
- 字：`label`（12px、.2em、500）。文案是動詞。
- 圖標：只用字元「→」「←」，放在文字後或前，間距 s2。
- 狀態：hover 底轉 ink-2；active 底轉 #000；focus 焦點環；disabled 底 paper-2、字 pencil、框 rule、`cursor: not-allowed`，不降透明度；loading 文字透明、中央 14px 1.5px 線圈，尺寸不變，禁用。
- 禁止：圓角、陰影、圖標庫、大寫英文（英文按鈕用正常大小寫）。

### 3.2 Inputs

**LineInput（訪客）**
- 無框、底線 1px ink、背景透明、字 `--f-hand` 16px、內距 6 0。
- 標籤 `label` 在上，字數計數 `latin` 12px 在右下。
- focus：底線 2px（調整內距避免跳動）。error：底線 err、下方一行 err 文字。
- 用於：一句話（≤ 30 字）、代碼、名字、留言。

**BoxInput（管理端）**
- 框 1px rule-2、底 sheet、字 `--f-sans` 14px、內距 9 12、高 40。
- focus：框轉 ink。error：框 err、下方一行 err 文字。
- 禁止：placeholder 當標籤；圓角；內陰影。

### 3.3 Select

原生 `<select>` 覆寫：`appearance: none`，框 rule-2，底 sheet，內距 9 32 9 12，右側 10×6 的 ink 箭頭 SVG（data URI），最小寬 180。focus 框轉 ink。只在管理端使用。

### 3.4 Segmented

| 變體 | 樣式 | 用途 |
|---|---|---|
| solid | 外框 1px ink，項之間 1px ink，選中底 ink 字 paper | 管理端狀態篩選 |
| quiet | 無框，項間距 s4，字 pencil，選中字 ink 加 1px 底線 | 訪客選項（方向、色調、表面） |

項內距 7 14（solid）、4 0（quiet）。字 `label`。鍵盤左右切換。

### 3.5 Checkbox / Toggle

- Checkbox：16 × 16 方形，框 1px ink，底 sheet；選中底 ink、paper 色打勾（8×4 旋轉 45°）。標籤在右，間距 10。
- Toggle（管理端可見開關）：以兩格 solid Segmented 呈現「可見 / 隱藏」，不做滑動開關。

### 3.6 Modals

全站只有兩種覆蓋層。

**ConfirmSheet（管理端）**
- 一張紙：底 paper、框 ink-top、寬 min(100%, 480)、內距 s6；背景遮罩 rgba(28,27,25,.4)。
- 內容：`title` 一句 + `body-sm` 一段 + 兩個按鈕（secondary 取消在左、danger/primary 在右）。
- Esc 關閉，焦點鎖定，關閉後焦點回到觸發元素。

**Fullscreen（訪客詳情）**
- 底 black，照片置中 `object-fit: contain`，對焦動效進入。
- 控制：左右（鍵盤、滑動、點擊兩側 30%）、退出（Esc、下滑、右上 ×）。1.5 秒無操作隱藏控制。
- 用 history state 讓返回鍵退出。

訪客端沒有確認對話框。

### 3.7 Navigation

**TopBar**
- 高 52（手機 48 固定）、底線 rule、內距 0 s5（手機 0 s4）。
- 左：Crumbs。工作室名 `latin` 500 15px；相簿名 `body-sm` pencil；目前格號 `mono` ink。以 ` › ` 分隔，每段可點。
- 右 slot：資料（`mono-sm` pencil）、Steps、或管理端連結。
- 沒有 logo 圖形、沒有選單、沒有漢堡。

**Steps**
- 兩段 18 × 2 的線，當前 ink、其餘 rule-2；左右兩個 `mono-sm` 字（調整、確認）。

**FilmStrip**
- 底 film、上下內距 14（窄 9）、齒孔見 1.7。橫向捲動、`scroll-snap-type: x mandatory`、隱藏捲軸、鍵盤左右。
- 完整：格寬 112、間距 6；格內 Photo 3:2 + 一行 `mono-sm`（格號左、方向右）。
- 窄：格寬 64、高 44、無文字、固定底部（z-film）。
- 格狀態：`cur` 外框 1px amber（offset 2）+ 格號 amber；`sel` 內縮 4px 的朱紅 2px 手繪圈（`border-radius: 50% 46% 52% 48% / 54% 48% 50% 46%; transform: rotate(-4deg)`）；兩者可同時存在。hover 同 cur。
- 版位：底片屬於內容欄，左緣與上下區塊對齊，不出血。寬度 `fit-content`，有多少格就多長，最後一格後留 32px 的底片尾；超過內容寬度才橫向捲動。固定底部的窄底片同樣對齊內容欄左緣。
- 攤開：從門口或書架進入相簿時，底片軌道從右側 28px 滑入並淡入（t-lift、e-out），同時頁面平滑捲動到引導行（「翻開了。點一張你想印的」）。只在進入時發生一次，重新整理不重播；減少動態時直接跳到位置。
- 紀律：全站同時最多一條。首頁不放；相簿總覽與桌機編輯器放完整；翻頁與詳情放窄。相簿少於 2 張時詳情頁不顯示窄底片。

### 3.8 Photo（基礎）

- `<img>` 包裝，`srcset` 480 / 960 / 1440 / 2048 WebP，`sizes` 依版位，`loading="lazy"`，`decoding="async"`。
- 比例：`ratio="original"` 用原始寬高撐位；`ratio="3:2"` 用 `object-fit: cover` 與 `object-position` 取 `Photo.focal`。
- 載入中：3:2 或原比例的 paper-2 骨架，1.4s 流動。載入完成直接出現，不淡入。
- 禁止：圓角、陰影、濾鏡（黑白預覽除外：`filter: grayscale(1)`）、遮罩、hover 縮放。

### 3.9 Photo Cards（PhotoFigure / FilmFrame / ContactCell）

系統裡沒有「卡片」。照片的三種容器：

| 容器 | 照片 | 文字 | 間距 | hover |
|---|---|---|---|---|
| PhotoFigure（翻頁、首頁封面） | 原比例 | Caption：`caption` pencil + `latin` 格號 | 照片與圖說 s2 | 圖說轉 ink、照片內緣 1px ink |
| FilmFrame（底片） | 3:2 | `mono-sm` 格號 + 方向 | 4 | 見 3.7 |
| ContactCell（印樣） | 3:2 | `mono-sm` 格號 | 格線 1px rule、內距 8 | 同 PhotoFigure |

### 3.10 Gallery

**PageSpread（翻頁）**
- 桌機兩欄（跨頁），欄間 1px rule；手機單欄。每頁 1 到 2 個 PhotoFigure。
- 版式：`full`（橫式滿欄）、`half`（橫式 58% 寬靠左）、`tall`（直式 60% 寬靠右）。預設依方向與順序三種循環，管理端可逐張指定。
- 頁碼 `latin` 11px pencil，左頁左下、右頁右下。
- 照片間距 s5（桌機 s7 上 s5 下）。
- 最後一頁底部：「翻完了」`story` + 文字按鈕「回到第一頁」。

**ContactSheet（印樣）**
- 桌機 4 欄、平板 4 欄、手機 3 欄，格線 1px rule，無間距。

**ModeSwitch**：quiet Segmented「翻頁 / 印樣」，記在 localStorage。

**Guide（引導行）**：相簿頭與底片之間一行 `story` 文字，你的口吻：「翻開了。**點一張你想印的**，一本只能印一張。」右側 `mono-sm`「12 張 · 選 1 張」。零張相簿隱藏。

**少量照片**：只有一頁時跨頁改為單欄置左，最寬 720；結尾文字「就這幾張。」且不顯示「回到第一頁」。零張時隱藏底片、模式切換與引導行，顯示 EmptyState「這本還是空的」。

### 3.11 Image Viewer（DetailView）

- 照片置中，`max-width: 1440px`，原比例，上方 s7、下方 s2。
- 左右：細箭頭 `latin` 22px pencil，寬 40；鍵盤 ← →；手機左右滑。
- 圖說列：`mono-sm` 格號 + `caption` 圖說，置中，間距 s5。
- ActionBar：左「回到第 n 頁」「全螢幕」（text）、右「印這一張」（primary）。
- 已印過提示：primary 上方一行 `body-sm` pencil。
- 載入：960 先出，1440 到了替換。

### 3.12 Photo Editor Controls

**Proof（相紙）**
- 比例 100:148，寬：桌機 min(100%, 360)、手機畫面高的 45% 以內；底色為選定紙色；陰影 shadow-proof。
- 內含照片區域（依 2.2）、一句話（拍立得）。
- 子元件：ProofMarks（四角 12px 裁切標記 pencil 1px，離角 16px；上方「100 mm」、左側旋轉「148 mm」，`mono-sm`；只在桌機與平板）；SafeZone（內縮 3% 的 safe 線；只在編輯器）；CropSurface（拖曳移動、滾輪／雙指縮放 1× 到 3×、雙擊重置；輸出 0 到 1 的相對座標；游標 grab/grabbing）。

**SpecRow**
- `grid-template-columns: 84px 1fr`，內距 14 20，底線 rule。左 `label` pencil，右控制項。
- 順序固定：方向、色調、框、紙色、一句話、表面。框為「無」時隱藏紙色與一句話；「細框」時隱藏一句話。

**FrameSelector**
- 三張小相紙 56 寬、比例 100:148、框 rule-2、底 sheet，內部以 #BFB5A4 色塊表示照片區域（none 滿、thin 內縮 6%、polaroid 內縮 6% 6% 22%）。下方 `mono-sm` 名稱。選中：外框 1px ink offset 3。鍵盤左右。

**PaperDots**
- 五個 24px 圓（手機 32），框 1px rule-2，間距 12（手機 16）。選中外圈 1px ink offset 3。hover 外圈 pencil。`role="radiogroup"`。

**ResolutionHint**
- 位置：相紙正下方，置中。
- ok：不顯示。warn：Alert warn「解析度偏低：裁切後約 W × H px，印出來可能偏軟。建議 1200 × 1800 以上」。block：Alert err「這張照片無法列印：裁切後低於 800 × 1200 px。請放寬裁切範圍或換一張」，且 primary 禁用。

### 3.13 Order Summary

- 列：`grid-template-columns: 80px 1fr`，內距 9 0，底線 rule。左 `label` pencil，右 `body-sm` 500；一句話那列右側用 `caption`。
- 順序：照片（格號 + 圖說）、尺寸（100 × 148 mm · 直式）、框（拍立得 · 白）、一句話、表面、數量（1 張）。
- 數量固定顯示「1 張」，不可編輯。

### 3.14 Toast

- 位置固定底部置中，距底 s5（加安全區），z-toast。手機底部動作列存在時疊在其上方 s3。
- 底 ink、字 paper `body-sm`、內距 12 18、左側 3px 功能色（ok / err）。右側 × `latin` film-mute。
- 150ms 上移 8px 淡入；3 秒自動消失，hover 暫停；同時最多一個，新來的取代舊的。
- `role="status"`（ok）/ `role="alert"`（err）。

### 3.15 Alert

- 左線 2px 功能色、底功能色 bg、字功能色 fg `body-sm`、內距 12 16。第一句 500 字重，第二句說怎麼辦。可附 `mono-sm` 資料行。無圖示。

### 3.16 Loading States

| 狀態 | 呈現 |
|---|---|
| Skeleton | paper-2 色塊，比例同內容，1.4s 流動（`background-size: 200%`）；`prefers-reduced-motion` 時靜止 |
| Button loading | 見 3.1 |
| 相紙合成中 | 相紙內照片區域骨架，紙色與框先畫 |
| 上傳進度（管理） | 每格縮圖上緣一條 2px ink 線由左向右填滿；失敗轉 err |
| 長時間 | 超過 8 秒在按鈕上方顯示「還在送，請稍等」`body-sm` pencil |

### 3.17 EmptyState

置中，`title` 一句 + `body-sm` pencil 一句 + 可選一個按鈕。外框 1px dashed rule-2（管理端）；訪客端無框。沒有插圖。

### 3.18 Stamp

- 方印 44 × 44（手機 40），框 2px vermilion，字「傑」`--f-serif` 20px 600 vermilion，`transform: rotate(-7deg)`，opacity .92。
- `drop` 動效見 4.7。只在成功頁與相簿總覽「已印過」格旁的小版（20px）使用。

### 3.19 管理端專用

- **DataTable**：表頭底 paper-2、`mono-sm` pencil 大寫字距 .08em；列底線 rule、內距 10 14 10 0、`body-sm`；列 hover 底 paper-2；focus 列左緣 2px ink；勾選欄 Checkbox；排序以表頭底線 ink 表示。
- **UploadDrop**：整頁可拖放，拖入時頁面外緣 2px dashed ink；中央「拖進來，或選檔」+ secondary 按鈕。
- **UploadStrip**：FilmStrip 完整版的變體，每格加進度線與狀態字（`mono-sm`：轉檔中 / 完成 / 失敗 + 原因）；失敗格外框 err，可點重試或移除。
- **StatusSegmented**：solid Segmented「新進 / 已列印 / 已交付」，新進後接 `mono` 數字。

---

## 4. Interaction

### 4.1 Hover

原則：照片不動，字會動，線會出現。觸控裝置用 `@media (hover: hover)` 包住所有 hover 規則。

| 元素 | Hover |
|---|---|
| PhotoFigure / ContactCell | 圖說 pencil → ink；照片內緣 `box-shadow: inset 0 0 0 1px var(--ink)` |
| FilmFrame | 格號與外框 → amber |
| Button primary | 底 → ink-2 |
| Button secondary | 底 → paper-2 |
| Button text / 連結 | 字與底線 → vermilion |
| Segmented quiet 項 | 字 pencil → ink |
| PaperDots / FrameSelector | 外圈 1px pencil |
| DataTable 列 | 底 → paper-2 |
| Proof、輸入框 | 無 |

### 4.2 Active（按下）

| 元素 | Active |
|---|---|
| PhotoFigure / ContactCell | 內緣 2px ink |
| Button primary | 底 #000 |
| Segmented quiet 項 | 底線出現 |
| PaperDots / FrameSelector | 外圈 ink |
| CropSurface | 游標 grabbing |

手機沒有 hover，圖說永遠 ink；按下狀態即上表。

### 4.3 Focus

- 所有可互動元素 `:focus-visible` 顯示 2px solid vermilion、offset 3px。例外：輸入框改為底線加粗或框轉 ink（不用朱紅）；FilmFrame 用 amber 2px；DataTable 列用左緣 2px ink。
- 不移除 outline；不用 `:focus` 取代 `:focus-visible`。
- 焦點順序與視覺順序一致；覆蓋層鎖定焦點。

### 4.4 Disabled

底 paper-2、字 pencil、框 rule、`cursor: not-allowed`、`aria-disabled`。不降透明度。禁用的 primary 旁一定有說明原因的文字（ResolutionHint 或名字欄位標籤轉 err）。

### 4.5 Loading

見 3.16。處理中不加全頁遮罩；只禁用觸發的按鈕與會衝突的輸入。

### 4.6 Transitions

```css
:root {
  --t-fast:    120ms;  /* 管理端所有狀態、Segmented */
  --t-base:    150ms;  /* hover、focus、按鈕、底片高亮、蓋章、Toast */
  --t-page:    250ms;  /* 翻頁、對焦、詳情進出 */
  --t-lift:    400ms;  /* 抬起 */
  --t-develop: 1200ms; /* 顯影 */
  --e-out:     cubic-bezier(.2,.7,.2,1);
  --e-stamp:   cubic-bezier(.6,0,.9,.5);
}
```

transition 只套在 `color`、`background-color`、`border-color`、`box-shadow`、`outline-color`、`opacity`、`transform`、`filter`。不 transition `all`。

### 4.7 Motion Guidelines

六個動效，各對應一個真實動作，只在那個動作發生時出現。

| 名稱 | 觸發 | 規格 |
|---|---|---|
| 翻頁 | 翻頁模式換頁、詳情左右 | 舊頁 `translateX(-12px)` + opacity 0，新頁從 `translateX(12px)` 進；t-page、e-out |
| 抬起 | 詳情按「印這一張」 | 照片 `translateY(-10px) scale(1.04)` + shadow-lift；t-lift、e-out；隨後路由進入編輯器，相紙位置接住 |
| 寫字 | 編輯器輸入一句話 | 相紙上的字逐字出現，每字 40ms |
| 蓋章 | 成功頁進入 | Stamp 從 `scale(1.6)` opacity 0 到 `scale(1)` opacity .92；t-base、e-stamp；一次，不彈跳 |
| 顯影 | 蓋章之後 | 相紙照片 `filter: brightness(0) contrast(1.5) blur(4px)` → 正常；t-develop、e-out；只在成功頁首次進入 |
| 對焦 | 進入全螢幕 | 照片 `blur(6px)` opacity .6 → 清晰；t-page、e-out；退出不反向 |

規則：
- 不新增第七個動效。Toast 的上移淡入與骨架流動是狀態，不是動效。
- 捲動不觸發任何動畫。沒有視差、進場、scroll-reveal。
- `prefers-reduced-motion: reduce`：翻頁與對焦改為 100ms 純淡入；抬起、蓋章、顯影直接呈現終點；寫字整句出現；骨架靜止。
- 動效不阻擋操作；顯影中訂單號已可讀。
- 成功頁重新整理不重播。

---

## 5. Responsive

### 5.1 Mobile（< 640）

- 邊距 20、欄距 16。display-1 36、display-2 26、body 15。
- TopBar 固定頂部，高 48。ActionBar 固定底部，高 60 加 `env(safe-area-inset-bottom)`；primary 滿寬在右、secondary 文字在左。
- 翻頁：單欄直向捲動，不做橫向翻頁；頁碼隨捲動更新；窄底片固定在 ActionBar 上方（詳情）或直接固定底部（翻頁，無 ActionBar）。
- 印樣 3 欄。
- 編輯器：Proof 固定頂部（sticky），高度 ≤ 45vh，shadow-proof-sm；ProofMarks 隱藏，SafeZone 保留；SpecRow 在下捲動；完整底片不顯示，「換一張」在 ActionBar 左。
- 觸控目標 ≥ 44 × 44。PaperDots 32、間距 16。
- 直排文字只在首頁相簿列，寬 24。
- 全螢幕：左右滑換張、下滑退出。

### 5.2 Tablet（640–1023）

- 8 欄、邊距 32。
- 翻頁：橫向時兩欄跨頁，直向時單欄。
- 編輯器：Proof 在上、SpecRow 在下（單欄），ProofMarks 顯示。完整底片顯示。
- TopBar 不固定。

### 5.3 Desktop（1024–1439）

- 12 欄、邊距 48、內容最寬 1280。
- 所有骨架（書架、頁、工作單）依 Phase 4 第 3 節。編輯器舞台左 1.25fr、規格列右 1fr。
- 鍵盤完整支援（見 6.1）。

### 5.4 Large（≥ 1440）

- 內容仍 1280 置中。詳情頁照片最大 1440（可超出內容寬，置中）。
- 不放大字級，不增加欄數。多出的空間是紙。

---

## 6. Accessibility

### 6.1 Keyboard Navigation

| 情境 | 鍵 |
|---|---|
| 翻頁、詳情、全螢幕 | ← → 換頁或換張；Enter 在詳情等於「印這一張」；Esc 退出全螢幕 |
| FilmStrip | Tab 進入，← → 移動，Enter 選擇，Home / End 到頭尾 |
| Segmented、FrameSelector、PaperDots | `role="radiogroup"`，← → 切換，空白或 Enter 選取 |
| CropSurface | 方向鍵移動 1%，Shift 加方向鍵 5%，+ / − 縮放，0 重置 |
| ConfirmSheet | Tab 鎖定，Esc 關閉 |
| 全站 | Skip link「跳到內容」為第一個可聚焦元素，聚焦時可見 |

### 6.2 Focus Visibility

見 4.3。焦點環永遠可見、永遠是 2px、永遠有 3px 偏移。不以顏色以外的方式隱藏。

### 6.3 Color Contrast

見 1.3 對比表。pencil 文字不用於字級 < 12px 的主要資訊；底片上 film-mute 文字字級 ≥ 11px。功能狀態不只靠顏色：警告與錯誤有文字，選中有外框或底線，進度有線條長度。

### 6.4 Screen Reader

- Photo 的 `alt` = 圖說（有）或「格號 + 相簿名」（無圖說）。裝飾性的相框選擇器小相紙 `aria-hidden`，由文字標籤承擔。
- FilmStrip `role="listbox"`，格 `role="option"`，`aria-selected` 表示 sel，`aria-current="true"` 表示 cur。
- Proof `role="img"`，`aria-label` 描述目前設定（例如「拍立得白框，直式，一句話：民宿的窗」）。
- Steps `aria-current="step"`。
- ResolutionHint 用 `aria-live="polite"`；送出錯誤 `role="alert"`。
- 蓋章與顯影對讀屏無意義，成功頁標題「收到了」為 h1，動效元素 `aria-hidden`。
- 直排日期以正常文字輸出，讀屏讀法不受 writing-mode 影響。
- 語言：`<html lang="zh-Hant-TW">`；英文副題加 `lang="en"`。

### 6.5 Touch Target

所有可點目標 ≥ 44 × 44（含不可見的外延區）。窄底片格 64 × 44。PaperDots 在手機 32 視覺、44 可點區。文字按鈕加 padding 到 44 高。

---

## 7. Content

- 口吻有兩個人：**你**（story、圖說、成功頁、首頁一句話）與**系統**（label、說明、錯誤）。你的話用 serif 或 hand；系統的話用 sans。
- 按鈕是動詞：翻開、印這一張、下一步、送出列印需求、回去修改、換一張、進去。不用確定、提交、OK、Submit。
- 錯誤兩句：發生什麼、怎麼辦。不道歉、不用語助詞。
- 不出現：購物車、商品、價格、結帳、訂購、優惠、立即、馬上。
- 用「相簿」「一本」「翻」「格」「相紙」「印」。
- 數字與單位：100 × 148 mm（乘號 ×、前後空白）、1200 × 1800 px、2026-08-14。
- 英文副題是另一個角度的註腳，不是翻譯。

---

## 8. Implementation Notes

### 8.1 Token 落地

- 所有 token 以 CSS custom properties 定義在 `:root`，檔名 `tokens.css`。組件只引用 token，不寫色碼。
- Print Spec 常數以 JS/TS 模組輸出（2.1），前端 Proof 與後端產圖共用同一個檔。
- 若使用 Tailwind，必須以 `theme.extend` 映射本文件的 token，並關閉預設色票與圓角；不使用預設灰階、`rounded-*`、`shadow-*`。

### 8.2 圖片管線

- 上傳：原檔逐位元存檔，記錄 sha256；HEIC 以伺服器端轉出衍生檔，原檔保留。
- 衍生檔：WebP 480 / 960 / 1440 / 2048 寬，品質 82，sRGB，套 Exif 方向；另存 `focal` 供 3:2 裁切。
- 列印檔：依 2.5；訂單建立後排程產生，可重算。
- 前端：`srcset` + `sizes`，`loading="lazy"`，翻頁與印樣用 IntersectionObserver 延遲載入，首屏最多 6 張。

### 8.3 字體載入

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&family=LXGW+WenKai+TC&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

自架時改為自行子集化（pyftsubset）並以 `unicode-range` 分段。相紙上的一句話所用的字體檔，前後端必須是同一個檔案。

### 8.4 狀態持久化（訪客）

localStorage keys：
- `shelf`：開過的相簿 `[{code, title, date, closed}]`
- `guest_name`
- `mode`：`pages | sheet`
- `spec:<code>:<frame>`：編輯中的 PrintSpec
- `printed:<code>`：已送出的格號與日期

所有讀寫包在 try/catch，失敗時功能照常、只是不記住。

### 8.5 檢查清單（開發完成前）

- [ ] 任何一頁找不到第二個 primary 按鈕
- [ ] 任何一頁找不到圓角（圓點與選取圈除外）
- [ ] 任何照片找不到陰影、濾鏡、遮罩
- [ ] 琥珀只出現在底片上；朱紅只出現在選取、印章、焦點、安全區
- [ ] 相紙在編輯器、確認、成功、管理端訂單、列印檔五處一致
- [ ] 捲動不觸發任何動畫
- [ ] 所有可互動元素有可見焦點、≥ 44px 觸控區
- [ ] `prefers-reduced-motion` 下六個動效都有替代
- [ ] 錯誤文案都是兩句
- [ ] 校正數值未填時相紙顯示「尚未校正」
