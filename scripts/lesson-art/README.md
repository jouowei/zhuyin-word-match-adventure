# 課文插圖

`public/lesson-art/<課文 id>.jpg`：每篇內建課文（`lessons/`）一張柔和的水彩繪本風插圖，淡淡的放在課文頁下方。

- 內容與畫風：`prompts.ts`（共用的畫風 `STYLE`，每課的場景 `SCENES`）。
- 用 Gemini `gemini-3.1-flash-image-preview` 畫，16:9。
- 縮成 960 寬、畫質 72 的 JPEG，每張約 60 KB。

## 重畫或加新的課文

1. 在 `prompts.ts` 加上或修改那一課的場景。
2. 畫：`GEMINI_API_KEY=… npx tsx scripts/lesson-art/draw.ts <暫存資料夾> <課文 id…>`（不寫 id 就畫全部）。
3. 一張一張看過：畫面裡不能有字（書名、招牌、卡片上的字都不行），內容要和課文相符（例如臺灣平地冬天不會下雪）。
4. 縮小放進遊戲（Windows PowerShell）：`.\scripts\lesson-art\shrink.ps1 -From <暫存資料夾> -To public\lesson-art`

# 環島冒險的圖

- `public/journey/map.jpg`：首頁的水彩臺灣地圖。先把遊戲的海岸線（`services/journey.ts` 的 `COAST_PATH`）畫成 900 × 1600 的底圖，再請 Gemini 照著底圖上水彩，所以站點會落在對的位置。`JourneyMap.tsx` 的 `ART` 記錄這張圖在地圖座標裡的位置；海岸線或站點座標改了就要重畫。
- `public/journey/<站 id>.jpg`：每一站的故事畫面一張（地點加上當地的朋友），`around.jpg` 是環島一圈回到基隆港。內容在 `journey.ts`。
- 畫：`GEMINI_API_KEY=… npx tsx scripts/lesson-art/draw.ts --journey <暫存資料夾> <站 id…>`，一樣要一張一張看過：不能有字（例如山坡上的「KEELUNG」）；動物要是臺灣真的有的（太魯閣的老鷹是大冠鷲，不是白頭海鵰）。再用 `shrink.ps1 -From <暫存資料夾> -To public\journey` 縮小。
