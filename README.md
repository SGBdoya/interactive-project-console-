# Grad Project Q&A Terminal | 畢業專案互動式諮詢終端

這是一個採用 **復古終端機 (Terminal)** 風格設計的互動式問答 (Q&A) 網頁。專門為了讓學弟妹、口試委員或訪客能快速了解您的碩士論文/研究專案而設計。

## 🌟 特色與亮點

- **純靜態架構**：僅使用 HTML, CSS, JavaScript (Vanilla JS) 且無外部框架依賴，極速載入。
- **免 API 費用**：不調用任何 LLM (如 OpenAI/Gemini) API，採用本地關鍵字權重比對演算法，零成本營運。
- **GitHub Pages 友善**：100% 靜態網頁，極適合直接託管於 GitHub Pages 上。
- **豐富美學設計**：
  - 支援復古 **CRT 螢幕掃描線與字體微光 (Glow)** 效果（可手動切換開關）。
  - 支援三種色彩主題切換：**Matrix 經典綠**、**Fallout 琥珀黃**、**賽博朋克霓虹**。
  - 動態打字機（Typewriter）輸出模擬與游標閃爍。
  - 支援電腦鍵盤 Command History (方向鍵 `↑` / `↓` 回溯輸入歷史)。
  - 底部快速提問標籤（Chips），可點擊直接查詢。

---

## 📂 檔案目錄結構

```
github_page/
├── index.html        # 網頁主結構 (Terminal 框體、CRT 濾鏡、輸入控制)
├── style.css         # 樣式表 (包含 Glassmorphism 磨砂玻璃、主題配色、動畫特效)
├── script.js         # 主要控制邏輯 (指令處理、打字模擬、關鍵字權重搜尋演算法)
├── faq.json          # 核心問答資料庫 (所有的專案問題與對應關鍵字都定義於此)
└── README.md         # 本說明文件
```

---

## 🛠️ 如何編輯問答資料集 (`faq.json`)

系統的所有問答內容皆儲存於 [faq.json](file:///C:/Users/User/Documents/tsong/github_page/faq.json) 中。您只需要修改或擴充該檔案即可，不需要調整 JavaScript 程式碼。

### 資料格式說明：

每一個問答項目 (Object) 包含以下 4 個欄位：

```json
{
  "id": "question_unique_id",
  "question": "顯示在列表中的完整問題內容？",
  "keywords": ["關鍵字1", "關鍵字2", "keyword3"],
  "answer": "顯示在終端機中的解答，支援部分 Markdown 語法"
}
```

### 欄位細節：
1. **`id`** (字串)：該問題的唯一代碼（英文小寫，可用底線連接）。使用者可輸入 `cat [id]` 直接開啟此內容。
2. **`question`** (字串)：問題的標題。前 5 個項目的標題會自動生成為底部的「快速提問」按鈕。
3. **`keywords`** (陣列)：當使用者輸入包含這些關鍵字時，將會匹配此問題。**建議放同義詞、中英文，例如 `["安裝", "架設", "setup", "install"]`**。
4. **`answer`** (字串)：詳細解答。
   - 支援換行符號 `\n`。
   - 支援 Markdown 語法：
     - **粗體**：使用 `**文字**`。
     - **程式碼區塊**：使用 ` ```程式碼 ``` `。
     - **行內程式碼**：使用 \`程式碼\`。
     - **超連結**：使用 `[連結文字](網址)`。

---

## 💻 本地執行方式

1. **直接開啟**：直接雙擊 [index.html](file:///C:/Users/User/Documents/tsong/github_page/index.html) 在瀏覽器中載入。
   * *注意：部分瀏覽器可能因安全限制 (CORS policy) 阻擋本地直接載入 `faq.json`。若有此狀況，請使用第二種方法。*
2. **使用 Local Server (推薦)**：
   - 如果您使用 VS Code，可以安裝 **Live Server** 套件，並點擊右下角 "Go Live"。
   - 或者，在終端機切換至本專案目錄下並執行：
     ```bash
     # 使用 Python 開啟簡易伺服器
     python -m http.server 8000
     ```
     然後在瀏覽器打開：`http://localhost:8000`

---

## 🚀 如何部署至 GitHub Pages

由於本專案為純靜態網頁，您可以直接使用 GitHub Pages 免費代管：

1. 在 GitHub 上創建一個新的 Repository (例如: `my-thesis-project`)。
2. 將本專案的所有檔案 (`index.html`, `style.css`, `script.js`, `faq.json`) 上傳或 Push 到您的 Repository 的 `main` 分支。
3. 進入 Repository 的 **Settings** (設定) -> **Pages**。
4. 在 **Build and deployment** 下方的 **Source** 選擇 **Deploy from a branch**。
5. 在 **Branch** 選擇 **`main`** 且目錄選擇 **`/ (root)`**，然後點擊 **Save** (儲存)。
6. 約等候 1-2 分鐘後，即可在頁面上方看到您的網站連結（網址格式通常為 `https://<your-github-username>.github.io/<repo-name>/`）。

---

## ⌨️ 終端可用指令表

在輸入框輸入以下指令並按 `Enter` 執行：

| 指令 | 說明 |
| :--- | :--- |
| `help` | 顯示系統支援的指令列表 |
| `ls` 或 `list` | 列出目前庫存中所有的問答題目與 ID |
| `cat <id>` | 直接閱讀特定 ID 的問答內容 (例如: `cat environment_setup`) |
| `theme` | 切換主機配色主題 (Matrix 綠 -> 琥珀黃 -> 賽博朋克霓虹) |
| `crt` | 開啟或關閉 CRT 螢幕復古濾鏡 |
| `clear` 或 `cls` | 清除終端機螢幕上的歷史對話 |
| `about` | 顯示本研究專案的作者資訊與系統背景 |
