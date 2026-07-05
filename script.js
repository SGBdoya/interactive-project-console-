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
    <span class="prompt-user">visitor@grad-project-terminal:~$</span>
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

  // 1. Check System Commands
  if (lowerQuery === 'clear' || lowerQuery === 'cls') {
    clearScreen();
    // Remove the query block we just appended
    return;
  }
  
  if (lowerQuery === 'help') {
    const helpText = `【系統說明與可用指令】
- help      : 顯示此說明文件。
- ls 或 list: 列出所有可查詢的專案問答項目與 ID。
- cat <id>  : 檢視指定問題 ID 的詳細解答。
- theme     : 切換色彩主題（綠色矩陣、琥珀黃、霓虹賽博）。
- crt       : 切換復古 CRT 螢幕濾鏡效果（開/關）。
- clear     : 清除螢幕內容。
- about     : 關於本專案與作者資訊。

※ 您也可以直接輸入任何問題關鍵字（例如：「怎麼安裝」、「架構」、「聯絡方式」），系統會進行關鍵字比對並回覆。`;
    typeWriter(helpText, logBlock);
    return;
  }

  if (lowerQuery === 'ls' || lowerQuery === 'list') {
    let listText = `【可用的專案問答主題列表】\n請輸入關鍵字，或者輸入 \`cat [問題ID]\` (例如: \`cat environment_setup\`) 查看詳細回覆：\n\n`;
    faqData.forEach((item, index) => {
      listText += `[${index + 1}] ID: ${item.id.padEnd(22)} | ${item.question}\n`;
    });
    typeWriter(listText, logBlock);
    return;
  }

  if (lowerQuery.startsWith('cat ')) {
    const targetId = lowerQuery.substring(4).trim();
    const item = faqData.find(d => d.id.toLowerCase() === targetId);
    if (item) {
      typeWriter(item.answer, logBlock);
    } else {
      typeWriter(`系統錯誤：找不到 ID 為 "${targetId}" 的問題。請輸入 \`ls\` 查看正確的 ID 列表。`, logBlock);
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

  if (lowerQuery === 'theme') {
    toggleTheme();
    typeWriter(`主題已切換為：${currentTheme.toUpperCase()}`, logBlock);
    return;
  }

  if (lowerQuery === 'crt') {
    toggleCRT();
    const isCrt = !document.body.classList.contains('crt-disabled');
    typeWriter(`CRT 螢幕濾鏡已${isCrt ? '開啟' : '關閉'}。`, logBlock);
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

// Toggle Palette CSS Themes
function toggleTheme() {
  const body = document.body;
  if (currentTheme === 'matrix') {
    body.setAttribute('data-theme', 'amber');
    currentTheme = 'amber';
  } else if (currentTheme === 'amber') {
    body.setAttribute('data-theme', 'cyberpunk');
    currentTheme = 'cyberpunk';
  } else {
    body.removeAttribute('data-theme');
    currentTheme = 'matrix';
  }
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
