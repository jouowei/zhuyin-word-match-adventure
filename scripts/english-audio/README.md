# 英文音檔產生器

用開源的 Kokoro-82M 語音模型（Apache-2.0）把遊戲裡的英文字母、單字、句子做成 mp3，放在 `public/audio/english/`，並產生 `english/audioClips.ts` 對照表。
每段都用 Whisper（whisper-base.en）聽一次，聽得出正確內容才採用；聽不對的會換語速或換聲音再試。

新增或修改 `english/` 裡的單字、句子後，重新產生：

```bash
cd scripts/english-audio
npm init -y && npm install kokoro-js@1.2.1 lamejs@1.2.1   # 約 420MB，只在這個資料夾
npx tsx inventory.ts      # 列出需要的音檔 → inventory.json
node gen.mjs              # 第一次會下載 Kokoro（約 92MB）和 Whisper（約 77MB）模型
node fix.mjs              # 沒通過的換更多說法再試
node gen2.mjs             # 改用 Kokoro 訓練時的音標寫法（雙母音一個符號）重做，聽對才替換
```

`report.json` 記錄每段的檢查結果；已通過的不會重做，刪掉 report.json 就會全部重做。
字母的發音（buh、kuh…）Whisper 常聽不準；buh、kuh 等改用短促收尾（bʌʔ），標為 chosen，需要實際聽過。
kokoro-js 預設用 eSpeak 音標，雙母音是兩個符號（ɔɪ），Kokoro v1.0 會把 boy 念成 bye；gen2.mjs 會轉成單一符號（Y）。
