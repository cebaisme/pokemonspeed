# Pokémon Champions 速度線研究所

繁體中文的速度線輔助工具第一版。Tauri 2 + 原生 HTML/CSS/JavaScript，同一份前端可在瀏覽器或 Windows 桌面執行。基本操作與隊伍文字匯入可離線使用；讀取 PokePaste 連結需要網路。無帳號、遠端字型或追蹤。

寶可夢名單依 [神奇寶貝百科 Champions 列表](https://wiki.52poke.com/wiki/寶可夢列表（Champions）)整理，截至 2026-09-23 的遊戲 1.2.0 版來源列有 395 種型態、231 個圖鑑編號，包括 81 種 Mega。飄浮泡泡、彩粉蝶、花潔夫人、多麗米亞、怖思壺、霜奶仙、莫魯貝可、一家鼠、怒鸚哥、來悲粗茶的外觀型態各合併為一筆，工具顯示 345 種型態。飄浮泡泡以一般型態顯示，其他天氣型態雖有不同屬性，但速度種族值相同。速度種族值和屬性以 [RotomPicks M-C 名單](https://rotompicks.com/en/pokemon/)交叉核對。**名單已擴充，特殊速度計算規則仍待核實。** 對戰規則可能只允許名單中的部分型態。

## 本機執行

先安裝 Node.js 22 或更新版本。進入專案資料夾：

```sh
npm run dev
```

開啟 http://127.0.0.1:1420 。網頁模式不需要安裝 npm 相依套件；不要直接雙擊 HTML（模組與 JSON 需要本機伺服器）。按 Ctrl+C 停止。

```sh
npm test
npm run build
```

Build 會把前端複製到 `dist/`，可部署在任何靜態網站子目錄。應用執行期間不需要網路。

## Windows 桌面開發與 Build

安裝 [Tauri 官方 Windows 前置工具](https://v2.tauri.app/start/prerequisites/)：Rust stable（MSVC toolchain）、Visual Studio C++ Build Tools 與 Windows SDK、Microsoft Edge WebView2 Runtime。下載相依套件與首次 Build 需要網路。

```sh
npm ci
npm run tauri -- dev
npm run tauri -- build
```

安裝程式輸出於 `src-tauri/target/release/bundle/nsis/`。一般使用者只需下載安裝程式，不需 Node.js 或 Rust。Windows 通常已有 WebView2；若缺少，安裝程式內附的 bootstrapper 會連網安裝 Runtime，因此首次安裝不保證全離線。安裝後資料與計算均為本機運作。

## 操作

- 左上「我的隊伍」新增最多六個參照。隊伍卡片可輸入 0–32 SP、選擇性格加減速，以及為個別寶可夢設定講究圍巾或黑色鐵球。也可切成直接輸入速度；直接輸入代表套用場況與所選道具之前的速度。搜尋欄、與主篩選區相同的屬性圖示按鈕及捲動清單可用來加入寶可夢；屬性最多選兩個，兩屬性一起選時取交集。
- 可貼上 PokePaste 隊伍文字或連結取代設定中的草稿隊伍，之後按「儲存隊伍」才會生效。匯入以 50 等計算，讀取速度投入、性格、可辨識的 Mega 石與速度道具；匯入對象需在目前名單中。本機開發伺服器與桌面版可讀取連結；若沒有網路，或將純靜態網站部署在沒有連結代理的伺服器上，請改貼隊伍文字。
- 儲存後帶有寶可夢圖片的綠色參照點即時顯示；同速點可能重疊，標籤會錯開並以連線對到原始位置。取消「顯示」可暫時隱藏。關閉設定或 Esc 不儲存草稿。
- 隊伍與每隻寶可夢的特性加速、速度階級儲存在 localStorage，重新啟動保留；瀏覽器與桌面版各自儲存，清除網站資料會移除隊伍。
- 右方搜尋中文、英文或圖鑑編號；與屬性、世代條件共同篩選。18 個屬性與「單屬性」共用兩個選擇名額；按第三顆時會自動取消最早選的一顆。兩種屬性使用 AND；「單屬性」限制為恰好一種屬性。世代多選為 OR；一般型態按寶可夢首次登場世代，地區型態按該型態登場世代（阿羅拉 VII、伽勒爾／洗翠 VIII、帕底亞 IX）。Mega 按鈕只顯示 Mega，並可依 Mega 型態首次登場作品 XY／ORAS／ZA／ZA DLC 多選篩選。
- 視窗變窄而改為單欄時，手機可左右滑動切換速度線與搜尋，電腦可按介面左右的切頁鍵。
- 右下大型「重置篩選」清除搜尋、屬性、世代及 Mega 條件，不影響目標、隊伍與速度狀態。
- 我方順風 ×2 套用全隊，圖上會顯示淡淡的風線。先點速度線上的我方寶可夢圖像，再按特性加速 ×2、調整 −6…+6 速度階級，只有選中的寶可夢受影響；每隻狀態獨立。對方目標仍有自己的順風、特性加速及階級。我方「重置速度」清除全隊的速度狀態與順風，對方「重置速度」只清除對方狀態。戲法空間會顯示淡格線，並讓較慢的寶可夢排在較上方；圖上的速度數值不變。
- 目標長條為 0 SP 減速性格到 32 SP 加速性格。普通型態另有圍巾滿速（中性）、圍巾極速（加速）、黑色鐵球 0 速；Mega 隱藏所有道具線。圖上顯示的最高速度對齊主線頂端、最低速度對齊底端，其他數值等比例排列。

## 暫用規則與之後替換

`src/js/speed.js` 集中處理計算。速度努力值（SP）為 **0–32** 的整數，每點增加 1 點性格修正前速度：

```
floor((速度種族值 + 20 + SP) × 性格)
```

UI 沒有個體值欄位。性格為 0.9 / 1 / 1.1，使用整數比例運算避免浮點取整誤差。例如雪妖女（種族值 110）中性 0 SP = 130、1 SP = 131、32 SP = 162；32 SP 加速 = 178。參考：[Kaylee Kim 的 Champions 速度公式推導](https://blog.kayleesk.com/pokemon-champions-speed/)。單項上限 32 依使用者確認；工具只管理速度投入，不管理全能力總點數。

先對階級取整，再將道具與順風／特性倍率相乘取整，最低 1。戲法空間目前只改變視覺排序；特殊取整、速度上限、麻痺與特殊特性尚未實作。舊示範版儲存的 EV 配置會轉為等效 SP，直接輸入的速度不變。

要正式發布完整對戰計算版本，仍需核實特殊取整順序、道具效果與各賽制的可用限制，再更新 `RULES`、`stat`、`modified` 與測試案例。

資料位於 `src/data/pokemon.json`。每筆包含獨立 `id`、圖鑑編號 `dex`、中英文名、`types`、型態登場世代 `generation`、速度種族值 `speed`、`available` 與 `mega`；Mega 另有 `megaDebut`。345 種顯示型態均可搜尋並加入隊伍。資料來源快照在 `scripts/roster-sources/`，可執行 `node scripts/generate-roster.mjs` 更新本機名單與圖片；來源與版本資訊記在 `src/data/roster-meta.json`。

## 發布到 GitHub Releases

1. 在自己的 GitHub 建立空白 repository，將本資料夾內容加入 Git 並推送。先將 `src-tauri/tauri.conf.json` 的 identifier 改為自己的唯一識別字。
2. 初次 Build 後將產生的 `src-tauri/Cargo.lock` 提交，固定 Rust 依賴；已附 npm lockfile。
3. 同步修改 package.json、Cargo.toml、tauri.conf.json 版本；更新 npm lockfile，提交變更。
4. 建立並推送版本標籤，例如 `git tag v0.1.0`、`git push origin v0.1.0`。
5. `.github/workflows/release.yml` 在 Windows runner 測試及建置 NSIS 安裝程式，建立 **Draft Release**。到 GitHub Releases 檢查說明與附件後手動 Publish。未設定程式碼簽章，Windows 可能顯示未知發行者。

也能於 Actions 手動執行工作流程，只產出可下載 artifact，不建立 Release。Repo 必須允許 Actions 使用 GITHUB_TOKEN 寫入 contents。此專案不包含自動更新程式。

## 結構

```
src/            原生前端、資料及計算模組
src-tauri/      Tauri 2 Windows 桌面外殼
scripts/        無相依套件的本機伺服器與 Build
tests/          速度、篩選、資料與儲存資料清理測試
.github/        Windows 建置及 Draft Release 工作流程
```

Tauri 設定依據：[官方配置文件](https://v2.tauri.app/reference/config/)。程式碼使用 MIT License；Pokémon 名称與相關權利屬原權利人，本專案為非官方粉絲工具，圖片取自使用者提供的神奇寶貝百科網頁存檔，素材來源與原檔名見 `src/assets/pokemon/README.md` 及 `sources.json`；圖片不適用程式碼的 MIT 授權。
