/**
 * Grad Project Q&A Terminal Logic
 */

// State variables
let faqData = [];
let commandHistory = [];
let historyIndex = -1;
let isTypingActive = false;
let typingTimeoutId = null;
let currentTheme = 'matrix';

// Interactive Theme Selection Mode State
let isThemeSelectionMode = false;
let selectedThemeIndex = 0;
let tempThemeBeforeSelection = '';
const themesList = [
  { id: 'matrix', name: 'Matrix 經典綠 (預設)' },
  { id: 'amber', name: 'Fallout 琥珀黃' },
  { id: 'cyberpunk', name: 'Cyberpunk 霓虹' },
  { id: 'dracula', name: 'Dracula 魅影紫' },
  { id: 'solarized', name: 'Solarized 深海藍' },
  { id: 'light', name: 'Paper Light 復古白' }
];
let activeThemeSelectorEl = null;

// Tutorial Mode State
let isTutorialMode = false;

// Tab completion state
let isTabCycling = false;
let tabOriginalInput = '';
let tabMatches = [];
let tabMatchIndex = 0;

// DOM Elements
const terminalInput = document.getElementById('terminal-input');
const cursor = document.querySelector('.cursor');
const outputHistory = document.getElementById('output-history');
const terminalBody = document.getElementById('terminal-body');
const terminalWindow = document.getElementById('terminal-window');
const currentTimeEl = document.getElementById('current-time');
const themeToggleBtn = document.getElementById('theme-toggle');
const crtToggleBtn = document.getElementById('crt-toggle');
const clearBtn = document.getElementById('clear-btn');
const chipsContainer = document.getElementById('chips-container');
const gitHubLink = document.getElementById('github-link');

// 1. Initialize Application
window.addEventListener('DOMContentLoaded', async () => {
  updateTime();
  setInterval(updateTime, 1000);

  // Load FAQ Database
  try {
    const response = await fetch('faq.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    faqData = await response.json();
    console.log('FAQ data loaded:', faqData);
    generateSuggestionChips();
  } catch (error) {
    console.error('Failed to load faq.json, using fallback data:', error);
    faqData = getFallbackFaqData();
    generateSuggestionChips();
  }

  // Focus Input on Terminal click
  terminalWindow.addEventListener('click', () => {
    terminalInput.focus();
  });

  // Handle Input events
  terminalInput.addEventListener('input', updateCursorPosition);
  terminalInput.addEventListener('keydown', handleKeyDown);
  
  // Theme Toggle (Matrix -> Amber -> Cyberpunk)
  themeToggleBtn.addEventListener('click', toggleTheme);

  // CRT Toggle
  crtToggleBtn.addEventListener('click', toggleCRT);

  // Clear Button
  clearBtn.addEventListener('click', clearScreen);

  // Initial cursor position
  updateCursorPosition();
});

// Update System Clock
function updateTime() {
  const now = new Date();
  const format = (num) => String(num).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${format(now.getMonth() + 1)}-${format(now.getDate())}`;
  const timeStr = `${format(now.getHours())}:${format(now.getMinutes())}:${format(now.getSeconds())}`;
  currentTimeEl.textContent = `${dateStr} ${timeStr}`;
}

// Generate Question Chips dynamically
function generateSuggestionChips() {
  chipsContainer.innerHTML = '';
  // Take first 4 or 5 questions as quick recommendation chips
  faqData.slice(0, 5).forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    
    // Shorten text for chip if too long
    let shortQuestion = item.question;
    if (shortQuestion.length > 12) {
      shortQuestion = shortQuestion.substring(0, 10) + '...';
    }
    
    chip.textContent = shortQuestion;
    chip.title = item.question;
    chip.addEventListener('click', () => {
      if (isTypingActive) return; // Ignore input when typing is printing
      terminalInput.value = item.question;
      updateCursorPosition();
      submitQuery(item.question);
    });
    chipsContainer.appendChild(chip);
  });
}

// Position custom cursor accurately
function updateCursorPosition() {
  const val = terminalInput.value;
  const tempSpan = document.createElement('span');
  
  // Match font styles exactly to measure correct width
  const computedStyle = window.getComputedStyle(terminalInput);
  tempSpan.style.fontFamily = computedStyle.fontFamily;
  tempSpan.style.fontSize = computedStyle.fontSize;
  tempSpan.style.fontWeight = computedStyle.fontWeight;
  tempSpan.style.letterSpacing = computedStyle.letterSpacing;
  tempSpan.style.visibility = 'hidden';
  tempSpan.style.position = 'absolute';
  tempSpan.style.whiteSpace = 'pre';
  
  tempSpan.textContent = val || '';
  document.body.appendChild(tempSpan);
  const width = tempSpan.getBoundingClientRect().width;
  document.body.removeChild(tempSpan);
  
  cursor.style.left = `${width}px`;
}

// Handle Key Events in Input
function handleKeyDown(e) {
  if (isThemeSelectionMode) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateThemeSelection(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateThemeSelection(1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirmThemeSelection();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelThemeSelection();
    } else {
      // Ignore normal inputs during selection mode
      e.preventDefault();
    }
    return;
  }

  // Reset tab cycle if any key other than Tab is pressed
  if (e.key !== 'Tab') {
    isTabCycling = false;
  }

  if (e.key === 'Enter') {
    const query = terminalInput.value.trim();
    if (query) {
      submitQuery(query);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (commandHistory.length > 0) {
      if (historyIndex === -1) {
        historyIndex = commandHistory.length - 1;
      } else if (historyIndex > 0) {
        historyIndex--;
      }
      terminalInput.value = commandHistory[historyIndex];
      updateCursorPosition();
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (commandHistory.length > 0) {
      if (historyIndex !== -1 && historyIndex < commandHistory.length - 1) {
        historyIndex++;
        terminalInput.value = commandHistory[historyIndex];
      } else {
        historyIndex = -1;
        terminalInput.value = '';
      }
      updateCursorPosition();
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    handleTabComplete();
  }
}

// Submit command or question query
function submitQuery(query) {
  // Save in history
  commandHistory.push(query);
  historyIndex = -1;

  // Render User Command line
  const logBlock = document.createElement('div');
  logBlock.className = 'terminal-block';
  
  const queryLine = document.createElement('div');
  queryLine.className = 'user-query-line';
  queryLine.innerHTML = `
    <span class="prompt-user">user@AOI-Lab:~$</span>
    <span class="query-text">${escapeHTML(query)}</span>
  `;
  logBlock.appendChild(queryLine);
  outputHistory.appendChild(logBlock);

  // Clear Input
  terminalInput.value = '';
  updateCursorPosition();

  // Scroll to bottom
  scrollToBottom();

  // Process system output
  processCommandOrQuery(query, logBlock);
}

// Parse input command or match QA query
function processCommandOrQuery(query, logBlock) {
  const lowerQuery = query.toLowerCase().trim();

  // 1. Tutorial Mode Intercept
  if (isTutorialMode) {
    if (lowerQuery === 'exit' || lowerQuery === 'quit' || lowerQuery === 'q') {
      isTutorialMode = false;
      terminalInput.placeholder = '輸入指令或問題... (例如: 怎麼執行、環境安裝)';
      typeWriter('已關閉教學手冊模式。', logBlock);
      return;
    }
    
    // Check if input matches a tutorial unit (like '1', '[1]', 'linux')
    const unitMatch = matchTutorialUnit(lowerQuery);
    if (unitMatch) {
      showTutorialUnit(unitMatch, logBlock);
      return;
    }
    
    // If user wants to clear screen, let it happen but exit tutorial mode
    if (lowerQuery === 'clear' || lowerQuery === 'cls') {
      isTutorialMode = false;
      terminalInput.placeholder = '輸入指令或問題... (例如: 怎麼執行、環境安裝)';
      clearScreen();
      return;
    }
    
    // Fall-through: if it's a non-tutorial command, exit tutorial mode and continue processing
    isTutorialMode = false;
    terminalInput.placeholder = '輸入指令或問題... (例如: 怎麼執行、環境安裝)';
  }

  // 2. Check System Commands
  if (lowerQuery === 'clear' || lowerQuery === 'cls') {
    clearScreen();
    // Remove the query block we just appended
    return;
  }
  
  if (lowerQuery === 'help') {
    const helpText = `【系統說明與可用指令】
- help      : 顯示此說明文件。
- ls 或 list: 列出所有可查詢的專案問答項目與 ID。
- cat <id/編號>: 檢視指定問題 ID 或編號的詳細解答。
- theme     : 顯示可用色彩主題列表，或輸入 \`theme [名稱/數字]\` 切換主題。
- crt       : 切換復古 CRT 螢幕濾鏡效果（開/關）。
- tutorial  : 顯示 Linux/tmux/Conda 常用指令快速教學手冊。
- clear     : 清除螢幕內容。
- about     : 關於本專案與作者資訊。

※ 您也可以直接輸入任何問題關鍵字（例如：「怎麼安裝」、「架構」、「聯絡方式」），系統會進行關鍵字比對並回覆。`;
    typeWriter(helpText, logBlock);
    return;
  }

  if (lowerQuery === 'ls' || lowerQuery === 'list') {
    let listText = `【可用的專案問答主題列表】\n請輸入關鍵字，或者輸入 \`cat [問題ID 或 編號]\` (例如: \`cat environment_setup\` 或 \`cat 2\`) 查看詳細回覆：\n\n`;
    faqData.forEach((item, index) => {
      listText += `[${index + 1}] ID: ${item.id.padEnd(22)} | ${item.question}\n`;
    });
    typeWriter(listText, logBlock);
    return;
  }

  if (lowerQuery.startsWith('cat ')) {
    const targetId = lowerQuery.substring(4).trim();
    
    // Check if user input is a number index
    const targetIndex = parseInt(targetId, 10);
    let item = null;
    
    if (!isNaN(targetIndex) && targetIndex >= 1 && targetIndex <= faqData.length) {
      item = faqData[targetIndex - 1];
    } else {
      // Otherwise, match by string ID (case-insensitive)
      item = faqData.find(d => d.id.toLowerCase() === targetId);
    }

    if (item) {
      typeWriter(item.answer, logBlock);
    } else {
      typeWriter(`系統錯誤：找不到 ID 或編號為 "${targetId}" 的問題。請輸入 \`ls\` 查看正確的列表與編號。`, logBlock);
    }
    return;
  }

  if (lowerQuery === 'about') {
    const aboutText = `【關於此專案】
- 項目名稱：碩士畢業論文研究專案 & 互動式 Q&A 終端
- 設計目的：為了解決實驗室後續學弟妹接手專案時的痛點，以終端機（Terminal）形式，整合預先定義好的問答集，降低維護與傳承成本。
- 技術特點：輕量化設計、100% 靜態部署（極適合 GitHub Pages）、無 LLM API 調用費用。
- 作者學長：畢業生 Tsong。`;
    typeWriter(aboutText, logBlock);
    return;
  }

  if (lowerQuery.startsWith('theme')) {
    const arg = lowerQuery.substring(5).trim();
    if (!arg) {
      startThemeSelection(logBlock);
    } else {
      let targetTheme = '';
      const idx = parseInt(arg, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= themesList.length) {
        targetTheme = themesList[idx - 1].id;
      } else {
        const matched = themesList.find(t => t.id === arg.toLowerCase());
        if (matched) targetTheme = matched.id;
      }

      if (targetTheme) {
        setTheme(targetTheme);
        typeWriter(`主題已成功變更為：${targetTheme.toUpperCase()}`, logBlock);
      } else {
        typeWriter(`無效的主題選擇：「${escapeHTML(arg)}」。請輸入 \`theme\` 進入互動選擇或查看可用主題列表。`, logBlock);
      }
    }
    return;
  }

  if (lowerQuery === 'crt') {
    toggleCRT();
    const isCrt = !document.body.classList.contains('crt-disabled');
    typeWriter(`CRT 螢幕濾鏡已${isCrt ? '開啟' : '關閉'}。`, logBlock);
    return;
  }

  if (lowerQuery.startsWith('tutorial')) {
    const arg = lowerQuery.substring(8).trim();
    if (!arg) {
      isTutorialMode = true;
      terminalInput.placeholder = '輸入單元編號 (如 1、2) 或輸入 exit 退出教學模式...';
      
      const tutorMenu = `【Linux 與實驗室環境快速上手教學手冊】
請直接輸入 <span class="highlight">[單元編號 或 關鍵字]</span> 閱讀對應單元教學，或輸入 <span class="highlight">exit</span> 退出：

  [1] linux   : 基礎 Linux 常用指令 (cd, ls, pwd)
  [2] tmux    : tmux 終端多工器 (如何在背景執行與掛載程序)
  [3] conda   : Conda 虛擬環境建立、啟動、列表與刪除
  [4] chmod   : 檔案執行權限設定 (chmod +x 腳本.sh)

💡 提示：現在您可以直接輸入數字（例如 \`1\`）來閱讀教學，輸入 \`exit\` 可隨時退出。`;
      typeWriter(tutorMenu, logBlock);
    } else {
      const unitMatch = matchTutorialUnit(arg);
      if (unitMatch) {
        showTutorialUnit(unitMatch, logBlock);
      } else {
        typeWriter(`無效的單元選擇：「${escapeHTML(arg)}」。請輸入 \`tutorial\` 查看正確的教學單元列表。`, logBlock);
      }
    }
    return;
  }


  // 2. Perform Keyword Matching
  const matchResult = searchFaqData(query);
  
  if (matchResult.bestMatch) {
    let responseText = matchResult.bestMatch.answer;
    
    // If there were other close matches, suggest them at the end
    if (matchResult.alternatives.length > 0) {
      responseText += `\n\n【您可能也想知道：】\n`;
      matchResult.alternatives.forEach(alt => {
        responseText += `👉 輸入關鍵字或 \`cat ${alt.id}\` : ${alt.question}\n`;
      });
    }
    
    // Add matching tag metadata info
    const metaBlock = document.createElement('div');
    metaBlock.className = 'tags-container';
    metaBlock.innerHTML = `
      <span class="tag-label"><i class="fa-solid fa-tags"></i> 匹配關鍵字:</span>
      ${matchResult.matchedKeywords.map(k => `<span class="match-tag">${escapeHTML(k)}</span>`).join('')}
    `;
    
    typeWriter(responseText, logBlock, () => {
      logBlock.appendChild(metaBlock);
      scrollToBottom();
    });
  } else {
    // No match found
    const fallbackText = `未找到完全匹配的主題。
別擔心！您可以：
1. 換個詞試試看（例如輸入：「安裝」、「啟動」、「聯絡學長」）。
2. 輸入 \`ls\` 列出所有主題。
3. 直接輸入 \`help\` 獲取說明。

目前為您推薦熱門問答：\n` + 
faqData.slice(0, 3).map(item => `• [${item.id}] ${item.question}`).join('\n');
    
    typeWriter(fallbackText, logBlock);
  }
}

// Keyword Matcher algorithm
function searchFaqData(query) {
  const normalizedQuery = query.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\+]/g, "").trim();
  
  let bestMatch = null;
  let highestScore = 0;
  let matchedKeywords = [];
  let scoringResults = [];

  // Match loop
  faqData.forEach(item => {
    let score = 0;
    let localMatched = [];

    // Rule A: Check if the user query contains any defined keywords
    item.keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      if (normalizedQuery.includes(lowerKeyword)) {
        // Direct keyword inclusion
        score += 3;
        localMatched.push(keyword);
      }
    });

    // Rule B: Check if the keyword contains the user query (substring)
    item.keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerKeyword.includes(normalizedQuery) && normalizedQuery.length >= 2) {
        score += 1.5;
        if (!localMatched.includes(keyword)) {
          localMatched.push(keyword);
        }
      }
    });

    // Rule C: Check if full question contains query
    if (item.question.toLowerCase().includes(normalizedQuery)) {
      score += 2;
    }
    
    // Rule D: Check if ID is queried
    if (item.id.toLowerCase() === normalizedQuery) {
      score += 10; // direct hit
    }

    if (score > 0) {
      scoringResults.push({
        item,
        score,
        matched: localMatched
      });
    }
  });

  // Sort candidates by score descending
  scoringResults.sort((a, b) => b.score - a.score);

  const alternatives = [];
  if (scoringResults.length > 0) {
    bestMatch = scoringResults[0].item;
    highestScore = scoringResults[0].score;
    matchedKeywords = scoringResults[0].matched;

    // Collect next top matches (up to 2) with score > 1
    for (let i = 1; i < scoringResults.length; i++) {
      if (scoringResults[i].score > 1.5 && alternatives.length < 2) {
        alternatives.push(scoringResults[i].item);
      }
    }
  }

  return {
    bestMatch,
    matchedKeywords,
    alternatives
  };
}

// Simulates real-time terminal typewriter output
function typeWriter(text, logBlock, callback) {
  isTypingActive = true;
  terminalInput.disabled = true; // disable typing during print to maintain clean outputs

  const responseContainer = document.createElement('div');
  responseContainer.className = 'system-response typing';
  logBlock.appendChild(responseContainer);

  let i = 0;
  const speed = 15; // characters per 15ms

  function type() {
    if (i < text.length) {
      // Print chunk-by-chunk for fast rendering of Chinese characters
      const charChunk = text.substring(i, i + 2);
      responseContainer.textContent += charChunk;
      i += 2;
      scrollToBottom();
      typingTimeoutId = setTimeout(type, speed);
    } else {
      completeTyping();
    }
  }

  function completeTyping() {
    responseContainer.classList.remove('typing');
    // Format links or bold tags in responses
    responseContainer.innerHTML = formatMarkdown(responseContainer.textContent);
    
    isTypingActive = false;
    terminalInput.disabled = false;
    terminalInput.focus();
    
    if (callback) callback();
    scrollToBottom();
  }

  type();
}

// Markdown formatting helper (converts `code`, links, and bold text)
function formatMarkdown(text) {
  let formatted = escapeHTML(text);

  // 1. Format code blocks ```code```
  formatted = formatted.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');

  // 2. Format inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 3. Format URL links [text](url)
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="highlight">$1</a>');

  // 4. Format bold text **text**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<span class="highlight">$1</span>');

  return formatted;
}

// Escape HTML entities to prevent scripts injection
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Scroll terminal body to bottom
function scrollToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

// Clear all logs in terminal history
function clearScreen() {
  outputHistory.innerHTML = '';
  terminalInput.value = '';
  updateCursorPosition();
  terminalInput.focus();
}

// Set Palette CSS Theme
function setTheme(themeName) {
  const body = document.body;
  const exists = themesList.some(t => t.id === themeName);
  if (!exists) return false;

  if (themeName === 'matrix') {
    body.removeAttribute('data-theme');
  } else {
    body.setAttribute('data-theme', themeName);
  }
  currentTheme = themeName;
  return true;
}

// Toggle Palette CSS Themes sequentially (for click button)
function toggleTheme() {
  const currentIndex = themesList.findIndex(t => t.id === currentTheme);
  const nextIndex = (currentIndex + 1) % themesList.length;
  setTheme(themesList[nextIndex].id);
}

// Toggle Retro CRT Filters
function toggleCRT() {
  const body = document.body;
  const isActive = body.classList.toggle('crt-disabled');
  if (isActive) {
    crtToggleBtn.classList.remove('active');
  } else {
    crtToggleBtn.classList.add('active');
  }
}

// Interactive Theme Selector functions
function startThemeSelection(logBlock) {
  isThemeSelectionMode = true;
  tempThemeBeforeSelection = currentTheme;
  
  // Find current theme index
  selectedThemeIndex = themesList.findIndex(t => t.id === currentTheme);
  if (selectedThemeIndex === -1) selectedThemeIndex = 0;
  
  terminalInput.value = '';
  terminalInput.readOnly = true;
  terminalInput.placeholder = '使用 [↑/↓] 選擇主題，[Enter] 確認，[Esc] 取消';
  
  activeThemeSelectorEl = document.createElement('div');
  activeThemeSelectorEl.className = 'theme-selector-menu';
  logBlock.appendChild(activeThemeSelectorEl);
  
  renderThemeSelectionMenu();
}

function renderThemeSelectionMenu() {
  if (!activeThemeSelectorEl) return;
  
  let html = `<div style="color: var(--text-secondary); margin-bottom: 6px;">
    【主題設定模式】<br>
    請使用方向鍵 <span class="highlight">[↑ / ↓]</span> 選擇主題，按 <span class="highlight">[Enter]</span> 確認，或 <span class="highlight">[Esc]</span> 取消：
  </div>`;
  
  themesList.forEach((theme, index) => {
    const isSelected = index === selectedThemeIndex;
    const pointer = isSelected ? '➔ ' : '   ';
    const activeClass = isSelected ? 'class="highlight"' : '';
    const radioIcon = isSelected ? '<i class="fa-regular fa-circle-dot"></i>' : '<i class="fa-regular fa-circle"></i>';
    
    html += `<div style="padding-left: 10px; line-height: 1.8; ${isSelected ? 'background: rgba(255,255,255,0.05);' : ''}">
      <span class="highlight">${pointer}</span>${radioIcon} <span ${activeClass}>${theme.name}</span>
    </div>`;
  });
  
  activeThemeSelectorEl.innerHTML = html;
  
  // Apply theme live!
  setTheme(themesList[selectedThemeIndex].id);
  scrollToBottom();
}

function navigateThemeSelection(direction) {
  selectedThemeIndex += direction;
  if (selectedThemeIndex < 0) {
    selectedThemeIndex = themesList.length - 1;
  } else if (selectedThemeIndex >= themesList.length) {
    selectedThemeIndex = 0;
  }
  renderThemeSelectionMenu();
}

function confirmThemeSelection() {
  isThemeSelectionMode = false;
  terminalInput.readOnly = false;
  terminalInput.placeholder = '輸入指令或問題... (例如: 怎麼執行、環境安裝)';
  
  const chosenTheme = themesList[selectedThemeIndex];
  
  if (activeThemeSelectorEl) {
    activeThemeSelectorEl.innerHTML = `
      <div style="color: var(--text-muted);">
        主題設定完成。已鎖定主題：<span class="highlight">${chosenTheme.name}</span>
      </div>
    `;
    activeThemeSelectorEl = null;
  }
  
  terminalInput.focus();
  scrollToBottom();
}

function cancelThemeSelection() {
  isThemeSelectionMode = false;
  terminalInput.readOnly = false;
  terminalInput.placeholder = '輸入指令或問題... (例如: 怎麼執行、環境安裝)';
  
  // Restore original theme
  setTheme(tempThemeBeforeSelection);
  
  if (activeThemeSelectorEl) {
    const origThemeName = themesList.find(t => t.id === tempThemeBeforeSelection).name;
    activeThemeSelectorEl.innerHTML = `
      <div style="color: var(--text-muted);">
        已取消主題變更。恢復原主題：<span class="highlight">${origThemeName}</span>
      </div>
    `;
    activeThemeSelectorEl = null;
  }
  
  terminalInput.focus();
  scrollToBottom();
}

// Local Fallback JSON in case fetch fails
function getFallbackFaqData() {
  return [
    {
      "id": "project_overview",
      "question": "這個專案主要在做什麼？（專案簡介）",
      "keywords": ["介紹", "做什麼", "簡介", "overview", "what", "project"],
      "answer": "【專案簡介】\n本研究所專案主要基於深度學習/系統架構設計，旨在解決...的問題。\n您可以輸入 `ls` 查看更多主題，或直接輸入關鍵字（例如：'環境'、'執行'）來提問。"
    },
    {
      "id": "environment_setup",
      "question": "如何安裝與設定開發環境？",
      "keywords": ["環境", "安裝", "架設", "setup", "install", "python"],
      "answer": "【環境安裝說明】\n1. 確保您的系統已安裝 Python 3.9+\n2. 安裝套件：`pip install -r requirements.txt`"
    }
  ];
}

// Handle Tab Autocompletes
function handleTabComplete() {
  const currentInput = terminalInput.value;
  if (!currentInput.trim()) return;

  if (isTabCycling && tabMatches.length > 0) {
    // Cycle to the next match
    tabMatchIndex = (tabMatchIndex + 1) % tabMatches.length;
    terminalInput.value = tabMatches[tabMatchIndex];
    updateCursorPosition();
    return;
  }

  // Initial trigger for Tab autocomplete
  tabOriginalInput = currentInput;
  tabMatches = [];
  tabMatchIndex = 0;

  // Compile completions list based on input state
  if (currentInput.toLowerCase().startsWith('cat ')) {
    const term = currentInput.substring(4);
    const idCandidates = faqData.map(d => d.id);
    const matchedIds = idCandidates.filter(id => id.toLowerCase().startsWith(term.toLowerCase()));
    tabMatches = matchedIds.map(id => 'cat ' + id);
  } else if (currentInput.toLowerCase().startsWith('theme ')) {
    const term = currentInput.substring(6);
    const themeCandidates = ['matrix', 'amber', 'cyberpunk', 'dracula', 'solarized', 'light'];
    const matchedThemes = themeCandidates.filter(t => t.toLowerCase().startsWith(term.toLowerCase()));
    tabMatches = matchedThemes.map(t => 'theme ' + t);
  } else if (currentInput.toLowerCase().startsWith('tutorial ')) {
    const term = currentInput.substring(9);
    const tutorCandidates = ['1', '2', '3', '4', 'linux', 'tmux', 'conda', 'chmod'];
    const matchedTutors = tutorCandidates.filter(t => t.toLowerCase().startsWith(term.toLowerCase()));
    tabMatches = matchedTutors.map(t => 'tutorial ' + t);
  } else {
    // Normal command list or general question keyword completions
    const commandCandidates = ['help', 'ls', 'list', 'clear', 'cls', 'about', 'theme', 'crt', 'cat', 'tutorial'];
    const idCandidates = faqData.map(d => d.id);
    const keywordCandidates = [...new Set(faqData.flatMap(d => d.keywords))];

    const allCandidates = [...commandCandidates, ...idCandidates, ...keywordCandidates];
    // Filter matching completions by prefix (case-insensitive)
    tabMatches = allCandidates.filter(c => c.toLowerCase().startsWith(currentInput.toLowerCase()));
  }

  // If match candidates found, apply the first one and turn on cycling mode
  if (tabMatches.length > 0) {
    isTabCycling = true;
    terminalInput.value = tabMatches[0];
    updateCursorPosition();
  }
}

// Tutorial Unit Helper matches and displays
function matchTutorialUnit(query) {
  const cleanQuery = query.replace(/[\[\]]/g, '').trim();
  
  if (cleanQuery === '1' || cleanQuery === 'linux') return '1';
  if (cleanQuery === '2' || cleanQuery === 'tmux') return '2';
  if (cleanQuery === '3' || cleanQuery === 'conda') return '3';
  if (cleanQuery === '4' || cleanQuery === 'chmod') return '4';
  
  return null;
}

function showTutorialUnit(unit, logBlock) {
  if (unit === '1') {
    const ch1 = `【[1] 基礎 Linux 指令教學】
在 Linux 系統中，所有檔案的操作與導覽都是透過指令完成。以下是五個最核心的基礎指令：

1. **pwd** (Print Working Directory) : 顯示目前所在的完整目錄路徑。
2. **ls** (List) : 列出目前目錄底下的所有檔案與資料夾。
   * 💡 *進階提示：使用 \`ls -la\` 可以列出詳細資料（包括權限、擁有者、修改日期）以及開頭為點的隱藏檔案（如 \`.env\` 或 \`.gitignore\`）。*
3. **cd [路徑]** (Change Directory) : 切換當前的工作目錄。
4. **cd ..** : 回到「上一層」目錄。(**注意：cd 與點點之間一定要有「空格」，寫成 \`cd..\` 在 Linux 會報錯！**)
5. **cd ~** : 直接回到當前使用者的「家目錄」（Home Directory）。

---

🎬 **【學弟實戰演練：完整目錄操作示範】**

假設伺服器上有個專案目錄，我們可以這樣操作：

Step 1: 先查看當前目錄有哪些東西
\`\`\`bash
user@server:~$ ls
data  models  src  README.md  run.sh
\`\`\`
*(看到了三個資料夾和兩個檔案)*

Step 2: 進入 \`src\` 資料夾
\`\`\`bash
user@server:~$ cd src
\`\`\`

Step 3: 查看 \`src\` 資料夾裡面的內容
\`\`\`bash
user@server:~/src$ ls
main.py  preprocess.py  utils.py
\`\`\`

Step 4: 查看自己當前所在的絕對路徑
\`\`\`bash
user@server:~/src$ pwd
/home/user/my_project/src
\`\`\`

Step 5: 辦完事，退回上一層目錄
\`\`\`bash
user@server:~/src$ cd ..
user@server:~$ 
\`\`\`
*(成功回到了專案根目錄！)*`;
    typeWriter(ch1, logBlock);
  } else if (unit === '2') {
    const ch2 = `【[2] tmux 終端多工器教學】
在伺服器跑深度學習實驗或長時間任務時，一旦斷網或關閉終端機，跑一半的程式就會中斷。**tmux 可以讓程式在背景（離線）持續運行。**

1. **建立新的背景視窗**：
   \`tmux new -s [session名稱]\` (例如：\`tmux new -s train\`)
   *進入後，您會看到下方有一條綠色的狀態列，代表您已成功處於 tmux 的視窗中。*
2. **暫時分離退出 (Detach)**：
   在視窗內按下鍵盤的 **\`Ctrl + B\`** 放開，接著按下 **\`D\`**。
   *您會退回到原本的終端機。此時您的工作已在背景安全運行，可以放心關閉終端機視窗或電腦。*
3. **列出背景運行的所有視窗**：
   \`tmux ls\`
4. **重新連接進入背景視窗 (Attach)**：
   \`tmux a -t [session名稱]\` (例如：\`tmux a -t train\`)
5. **強制關閉背景視窗**：
   \`tmux kill-session -t [session名稱]\`
6. **滑鼠與視窗滾動檢視 Log**：
   在 tmux 中無法直接用滑鼠滾輪往上滑。請按 **\`Ctrl + B\`** 放開，再按 **\`[\`** 鍵，即可使用方向鍵或 PageUp/PageDown 上下查看歷史 Log。按 **\`Q\`** 可退出該滾動模式。`;
    typeWriter(ch2, logBlock);
  } else if (unit === '3') {
    const ch3 = `【[3] Conda 虛擬環境管理教學】
為了避免不同 Python 專案的套件版本互相衝突（例如 A 專案要 PyTorch 1.12，B 專案要 2.0），我們使用 Conda 管理各自獨立的虛擬環境。

1. **新建虛擬環境**：
   \`conda create -n [環境名稱] python=[版本]\`
   *例如：\`conda create -n twin_env python=3.9\`*
2. **啟動環境**：
   \`conda activate [環境名稱]\`
   *例如：\`conda activate twin_env\`*
   *啟動後，指令列最前方的括號會由 \`(base)\` 變為 \`(twin_env)\`。*
3. **查看所有已建立的環境清單**：
   \`conda env list\` 或是 \`conda info --envs\`
4. **退出當前虛擬環境**：
   \`conda deactivate\`
5. **刪除整個虛擬環境**：
   \`conda remove -n [環境名稱] --all\`
   *例如：\`conda remove -n twin_env --all\`*`;
    typeWriter(ch3, logBlock);
  } else if (unit === '4') {
    const ch4 = `【[4] 檔案執行權限設定 (chmod +x) 教學】
在 Linux 系統中，新建的腳本檔案（如 \`.sh\` 檔案）預設是沒有執行權限的。如果您直接執行會出現 \`Permission denied\` 錯誤。

1. **給予腳本執行權限**：
   \`chmod +x [檔案名稱.sh]\`
   *例如：\`chmod +x run.sh\`*
2. **執行該腳本**：
   使用 \`./\` 開頭代表執行當前目錄下的程式。
   *例如：\`./run.sh\`*
3. **查看檔案詳細權限**：
   \`ls -lh [檔案名稱.sh]\`
   *輸出中若包含 \`-rwxr-xr-x\`，其中的 \`x\` (eXecutable) 就代表該檔案已具備執行權限。*`;
    typeWriter(ch4, logBlock);
  }
}
