# 寶可夢圖片

結果格子依 `src/data/pokemon.json` 的 `image` 欄位讀取本機圖片，支援 WebP 與 PNG。普通型態與 Mega／地區型態各自使用獨立圖片。

已從使用者提供的神奇寶貝百科網頁存檔匯入 26 張一般配色圖片。原始檔名為 PNG，但實際格式為 WebP；現已真正轉為 PNG，使用中文檔名（如「雪妖女.png」「Mega波士可多拉.png」），保留原始尺寸與透明背景，沒有放大。原檔名與對應列於 `sources.json`。其餘圖片留在使用者原 ZIP 中，尚未新增到示範寶可夢名單。

素材來源：[神奇寶貝百科 Champions 列表](https://wiki.52poke.com/wiki/宝可梦列表（Champions）)，由使用者提供網頁圖片存檔。寶可夢圖像權利屬原權利人，不適用本專案程式碼的 MIT 授權。

Mega 篩選鍵的超級石 SVG 取自[寶可夢官方 Mega Evolution 網站](https://mega.pokemon.com/en-us/)；圖像權利同樣屬原權利人。

重新整理素材時：先以 `scripts/import-images.ps1 -ZipPath <ZIP路徑>` 匯入，再以具備 Pillow 的 Python 執行 `scripts/convert-images.py`，最後執行 `npm run build`。一般啟動與 Build 不需要 Python。圖片隨應用程式打包，執行期間不需連線。缺圖時顯示「圖片待補」，名稱可透過滑鼠提示與輔助閱讀取得。
