(() => {
  "use strict";

  const STORAGE_KEY = "studio-code-editor-project-v1";
  const GITHUB_API = "https://api.github.com";
  const extensionCatalog = [
    { id: "html-tools", name: "HTML Essentials", publisher: "Studio", icon: "</>", description: "HTML templates, tag helpers, and accessible markup snippets.", color: "orange" },
    { id: "css-craft", name: "CSS Craft", publisher: "Studio", icon: "#", description: "Handy layout, color, and responsive CSS snippets.", color: "blue" },
    { id: "js-companion", name: "JavaScript Companion", publisher: "Studio", icon: "JS", description: "JavaScript starter snippets and browser API examples.", color: "yellow" },
    { id: "theme-midnight", name: "Midnight Bloom", publisher: "Studio Themes", icon: "✳", description: "A calm, high-contrast dark editor palette.", color: "purple" },
    { id: "theme-paper", name: "Soft Paper", publisher: "Studio Themes", icon: "◐", description: "A warm, readable light editor palette.", color: "green" }
  ];
  const defaultFiles = {
    "index.html": `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Little moments, made lovely</title>
</head>
<body>
  <main class="card">
    <span class="eyebrow">A LITTLE SOMETHING FOR YOU</span>
    <div class="flower" aria-hidden="true">✿</div>
    <h1>Make room for<br><span>the good things.</span></h1>
    <p>Slow mornings. Golden light. The people who feel like home. Start anywhere — let the little things find their way.</p>
    <button id="surprise">Find a little joy <span>↗</span></button>
    <div class="card-footer"><span class="footer-dot"></span> A reminder to enjoy the in-between</div>
  </main>
</body>
</html>`,
    "styles.css": `:root {
  color-scheme: light;
  --ink: #3c3845;
  --plum: #765a75;
  --rose: #d9a6a0;
  --paper: #f8f4f0;
}

* { box-sizing: border-box; }
body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 28px;
  background:
    radial-gradient(ellipse at 15% 15%, #f5e9e3 0, transparent 37%),
    radial-gradient(ellipse at 83% 83%, #eae7f2 0, transparent 40%), var(--paper);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;
}

.card {
  position: relative;
  width: min(440px, 100%);
  padding: 53px 48px 27px;
  overflow: hidden;
  border: 1px solid #fff9;
  border-radius: 10px;
  background: #ffffffcf;
  box-shadow: 0 24px 70px #56455a12, 0 4px 14px #56455a0a;
  text-align: center;
  backdrop-filter: blur(12px);
  animation: arrive .7s cubic-bezier(.2,.8,.2,1) both;
}

.eyebrow { color: #9d8698; font-size: 9px; font-weight: 600; letter-spacing: .2em; }
.flower { margin: 24px 0 13px; color: var(--rose); font-size: 34px; animation: sway 5s ease-in-out infinite; }
h1 { margin: 0; font: 500 clamp(31px, 7vw, 43px)/1.19 'Playfair Display', Georgia, serif; letter-spacing: -.8px; }
h1 span { color: var(--plum); font-style: italic; }
p { max-width: 310px; margin: 17px auto 24px; color: #817b87; font-size: 12px; line-height: 1.85; }
button { min-width: 169px; padding: 12px 16px; border: 0; border-radius: 5px; background: var(--plum); color: white; cursor: pointer; font: 500 11px 'DM Sans', sans-serif; transition: transform .2s, background .2s; }
button:hover { transform: translateY(-2px); background: #654b64; }
button span { margin-left: 12px; color: #ead8e6; }
.card-footer { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 37px; padding-top: 16px; border-top: 1px solid #eee9e7; color: #aaa3ad; font-size: 9px; letter-spacing: .02em; }
.footer-dot { width: 5px; height: 5px; border-radius: 50%; background: #d9a6a0; }
@keyframes arrive { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sway { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@media (max-width: 420px) { .card { padding: 42px 25px 24px; } }`,
    "script.js": `const button = document.querySelector("#surprise");
const messages = [
  "You make ordinary days feel a little more golden.",
  "Somewhere, someone is really glad you're here.",
  "This moment counts, too. Make it yours."
];

button.addEventListener("click", () => {
  const message = messages[Math.floor(Math.random() * messages.length)];
  document.querySelector("p").textContent = message;
  console.log("A little joy, delivered.");
});`
  };
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    fileList: $("#fileList"), tabList: $("#tabList"), codeInput: $("#codeInput"),
    highlightLayer: $("#highlightLayer"), lineNumbers: $("#lineNumbers"),
    breadcrumbFile: $("#breadcrumbFile"), languageStatus: $("#languageStatus"),
    cursorPosition: $("#cursorPosition"), previewFrame: $("#previewFrame"),
    previewPanel: $("#previewPanel"), previewEmpty: $("#previewEmpty"),
    previewState: $("#previewState"), panelContent: $("#panelContent"),
    consoleIndicator: $("#consoleIndicator"), statusMessage: $("#statusMessage"),
    toast: $("#toast"), modal: $("#modalBackdrop"), fileForm: $("#fileForm"),
    fileNameInput: $("#fileNameInput"), dialogError: $("#dialogError"),
    saveButton: $("#saveButton"), projectName: $("#projectName"),
    findInput: $("#findInput"), outlineList: $("#outlineList")
  };

  let files = { ...defaultFiles };
  let activeFile = "index.html";
  let openFiles = ["index.html", "styles.css", "script.js"];
  let savedSnapshot = JSON.stringify({ files, activeFile, openFiles });
  let autosaveTimer;
  let toastTimer;
  let previewTimer;
  let previewRunId = 0;
  let previewLogs = [];
  let activePanel = "problems";
  let isLightTheme = false;
  let activeTool = "explorer";
  let stagedFiles = new Set();
  let gitBaseFiles = { ...defaultFiles };
  let gitHistory = [];
  let installedExtensions = new Set();
  let accountProfile = { name: "Studio User", email: "", handle: "" };
  let remoteAbortController;

  function toast(message, duration = 2600) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), duration);
  }

  function getSnapshot() {
    return JSON.stringify({ files, activeFile, openFiles });
  }

  function isDirty(name) {
    try {
      const savedFiles = JSON.parse(savedSnapshot).files;
      return files[name] !== savedFiles[name];
    } catch (error) {
      console.error("Could not compare the saved project.", error);
      return true;
    }
  }

  function markChanged() {
    renderFiles();
    renderTabs();
    updateSaveButton();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => persistProject(false), 450);
    $("#statusMessage").textContent = "Changes saved locally as you work.";
  }

  function persistProject(manual) {
    const payload = {
      files, activeFile, openFiles, projectName: "untitled-project",
      gitBaseFiles, stagedFiles: [...stagedFiles], gitHistory,
      installedExtensions: [...installedExtensions], accountProfile
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      const message = error && error.name === "QuotaExceededError"
        ? "Browser storage is full. Download your files to keep a backup."
        : "Could not save this project in browser storage.";
      $("#statusMessage").textContent = message;
      toast(message, 4500);
      return false;
    }
    if (manual) {
      savedSnapshot = getSnapshot();
      renderFiles();
      renderTabs();
      updateSaveButton();
      $("#statusMessage").textContent = "All changes saved to this browser.";
      toast("Project saved to this browser.");
    }
    return true;
  }

  function updateSaveButton() {
    const dirty = Object.keys(files).some(isDirty);
    elements.saveButton.classList.toggle("is-saved", !dirty);
    elements.saveButton.innerHTML = dirty
      ? '<span class="save-icon">↥</span> Save project'
      : '<span class="save-icon">✓</span> Saved';
  }

  function extension(name) {
    const dot = name.lastIndexOf(".");
    return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
  }

  function fileSymbol(name) {
    const ext = extension(name);
    return ({ html: "5", css: "#", js: "JS", mjs: "JS", cjs: "JS", json: "{}", md: "M", svg: "◇" })[ext] || "·";
  }

  function languageFor(name) {
    const ext = extension(name);
    return ({ html: "HTML", css: "CSS", js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", json: "JSON", md: "Markdown", svg: "SVG" })[ext] || (ext ? ext.toUpperCase() : "Plain Text");
  }

  function renderFiles() {
    elements.fileList.replaceChildren();
    Object.keys(files).sort((a, b) => {
      if (a === "index.html") return -1;
      if (b === "index.html") return 1;
      return a.localeCompare(b);
    }).forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `file-row${activeFile === name ? " active" : ""}`;
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-current", activeFile === name ? "page" : "false");
      const icon = document.createElement("span");
      icon.className = `file-icon ${extension(name) || "generic"}`;
      icon.textContent = fileSymbol(name);
      const label = document.createElement("span");
      label.className = "file-name";
      label.textContent = name;
      button.append(icon, label);
      if (isDirty(name)) {
        const dirty = document.createElement("span");
        dirty.className = "file-dirty";
        dirty.setAttribute("aria-label", "Unsaved changes");
        button.append(dirty);
      }
      button.addEventListener("click", () => openFile(name));
      elements.fileList.append(button);
    });
  }

  function renderTabs() {
    openFiles = openFiles.filter((name, index, all) => Object.hasOwn(files, name) && all.indexOf(name) === index);
    if (Object.hasOwn(files, activeFile) && !openFiles.includes(activeFile)) openFiles.push(activeFile);
    elements.tabList.replaceChildren();
    openFiles.forEach((name) => {
      const tab = document.createElement("div");
      tab.className = `tab${name === activeFile ? " active" : ""}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", name === activeFile ? "true" : "false");
      tab.addEventListener("click", (event) => {
        if (event.target.closest(".tab-close")) return;
        openFile(name);
      });
      const icon = document.createElement("span");
      icon.className = `tab-file-icon ${extension(name)}`;
      icon.textContent = fileSymbol(name);
      const label = document.createElement("span");
      label.textContent = name;
      tab.append(icon, label);
      if (isDirty(name)) {
        const dirty = document.createElement("span");
        dirty.className = "tab-dirty";
        dirty.setAttribute("aria-label", "Unsaved changes");
        tab.append(dirty);
      } else {
        const close = document.createElement("button");
        close.className = "tab-close";
        close.type = "button";
        close.setAttribute("aria-label", `Close ${name}`);
        close.textContent = "×";
        close.addEventListener("click", () => closeTab(name));
        tab.append(close);
      }
      elements.tabList.append(tab);
    });
  }

  function openFile(name) {
    if (!Object.hasOwn(files, name)) return;
    if (window.matchMedia("(max-width: 760px)").matches) $("#sidebar").classList.remove("mobile-open");
    activeFile = name;
    if (!openFiles.includes(name)) openFiles.push(name);
    elements.codeInput.value = files[name];
    elements.breadcrumbFile.textContent = name;
    elements.languageStatus.textContent = languageFor(name);
    renderFiles();
    renderTabs();
    refreshEditor();
    renderOutline();
    elements.previewEmpty.hidden = name === "index.html";
    if (name === "index.html") schedulePreview();
    elements.codeInput.focus({ preventScroll: true });
  }

  function closeTab(name) {
    openFiles = openFiles.filter((item) => item !== name);
    if (activeFile === name) {
      activeFile = openFiles.at(-1) || Object.keys(files)[0];
    }
    if (activeFile) openFile(activeFile);
    else renderTabs();
    persistProject(false);
  }

  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(code, name) {
    const ext = extension(name);
    const escaped = escapeHtml(code);
    if (ext === "html" || ext === "svg") {
      return escaped.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[\w:-]+)|([\w:-]+(?==))|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(&gt;)|(\b\d+\b)/g,
        (match, comment, tag, attr, string, close, number) => {
          if (comment) return `<span class="token-comment">${comment}</span>`;
          if (tag) return `<span class="token-tag">${tag}</span>`;
          if (attr) return `<span class="token-attr">${attr}</span>`;
          if (string) return `<span class="token-string">${string}</span>`;
          if (close) return `<span class="token-punctuation">${close}</span>`;
          if (number) return `<span class="token-number">${number}</span>`;
          return match;
        });
    }
    if (ext === "css") {
      return escaped.replace(/(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#(?:[0-9a-fA-F]{3,8})\b)|(\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b)|([\w-]+(?=\s*:))|([{}:;,])/g,
        (match, comment, string, color, number, property, punctuation) => {
          if (comment) return `<span class="token-comment">${comment}</span>`;
          if (string) return `<span class="token-string">${string}</span>`;
          if (color) return `<span class="token-number">${color}</span>`;
          if (number) return `<span class="token-number">${number}</span>`;
          if (property) return `<span class="token-property">${property}</span>`;
          if (punctuation) return `<span class="token-punctuation">${punctuation}</span>`;
          return match;
        });
    }
    if (["js", "mjs", "cjs", "json"].includes(ext)) {
      const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:const|let|var|function|return|if|else|for|of|in|while|new|class|extends|import|from|export|default|async|await|throw|try|catch|true|false|null|undefined|this|typeof|instanceof|switch|case|break|continue)\b)|(\b\d+(?:\.\d+)?\b)|([\w$]+(?=\s*\())/g;
      return escaped.replace(pattern, (match, comment, string, keyword, number, fn) => {
        if (comment) return `<span class="token-comment">${comment}</span>`;
        if (string) return `<span class="token-string">${string}</span>`;
        if (keyword) return `<span class="${/^(true|false|null|undefined)$/.test(keyword) ? "token-number" : "token-keyword"}">${keyword}</span>`;
        if (number) return `<span class="token-number">${number}</span>`;
        if (fn) return `<span class="token-function">${fn}</span>`;
        return match;
      });
    }
    return escaped;
  }

  function refreshEditor() {
    const value = elements.codeInput.value;
    elements.highlightLayer.innerHTML = `${highlight(value, activeFile)}\n`;
    const lineCount = value.split("\n").length;
    elements.lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
    elements.highlightLayer.scrollTop = elements.codeInput.scrollTop;
    elements.highlightLayer.scrollLeft = elements.codeInput.scrollLeft;
    elements.lineNumbers.scrollTop = elements.codeInput.scrollTop;
    updateCursor();
    updateOutline();
  }

  function updateCursor() {
    const beforeCursor = elements.codeInput.value.slice(0, elements.codeInput.selectionStart);
    const lines = beforeCursor.split("\n");
    $("#cursorPosition").textContent = `Ln ${lines.length}, Col ${lines.at(-1).length + 1}`;
  }

  function updateOutline() {
    const matches = [...elements.codeInput.value.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
    $("#outlineCount").textContent = matches.length;
    elements.outlineList.replaceChildren();
    matches.forEach((match) => {
      const item = document.createElement("div");
      item.className = "outline-item";
      item.textContent = `H${match[1]}  ${match[2].replace(/<[^>]*>/g, "").trim().slice(0, 30)}`;
      item.addEventListener("click", () => {
        const position = elements.codeInput.value.indexOf(match[0]);
        elements.codeInput.focus();
        elements.codeInput.setSelectionRange(position, position + match[0].length);
      });
      elements.outlineList.append(item);
    });
  }

  function renderOutline() {
    updateOutline();
  }

  function updateActiveContent() {
    files[activeFile] = elements.codeInput.value;
    refreshEditor();
    markChanged();
    if (activeFile === "index.html") schedulePreview();
  }

  function schedulePreview() {
    elements.previewState.textContent = "Updating…";
    clearTimeout(previewTimer);
    previewTimer = setTimeout(runPreview, 350);
  }

  function createPreviewDocument() {
    const htmlName = Object.keys(files).find((name) => name.toLowerCase() === "index.html") || activeFile;
    let html = files[htmlName] || "";
    const cssName = Object.keys(files).find((name) => extension(name) === "css" && /styles?\.css$/i.test(name)) ||
      Object.keys(files).find((name) => extension(name) === "css");
    const jsName = Object.keys(files).find((name) => /^(script|index|main)\.(js|mjs|cjs)$/i.test(name)) ||
      Object.keys(files).find((name) => ["js", "mjs", "cjs"].includes(extension(name)));
    if (cssName) {
      const localName = cssName.split(/[\\/]/).pop().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const linkPattern = new RegExp(`<link\\b(?=[^>]*\\bhref\\s*=\\s*["'][^"']*${localName}["'])[^>]*>`, "gi");
      html = html.replace(linkPattern, "");
      const css = `<style>\n${files[cssName]}\n</style>`;
      html = /<\/head\s*>/i.test(html) ? html.replace(/<\/head\s*>/i, `${css}\n</head>`) : `${css}\n${html}`;
    }
    if (jsName) {
      const localName = jsName.split(/[\\/]/).pop().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const scriptPattern = new RegExp(`<script\\b(?=[^>]*\\bsrc\\s*=\\s*["'][^"']*${localName}["'])[^>]*>\\s*<\\/script\\s*>`, "gi");
      html = html.replace(scriptPattern, "");
    }
    const runId = ++previewRunId;
    const bridge = `<script>
(() => {
  const runId = ${runId};
  const send = (type, args) => {
    let message;
    try { message = args.map((value) => value instanceof Error ? value.stack || value.message : typeof value === "string" ? value : JSON.stringify(value)).join(" "); }
    catch (error) { message = String(error); }
    parent.postMessage({ source: "studio-preview", runId, type, message }, "*");
  };
  ["log", "info", "warn", "error"].forEach((type) => {
    const original = console[type].bind(console);
    console[type] = (...args) => { original(...args); send(type, args); };
  });
  addEventListener("error", (event) => send("error", [event.message]));
})();
</script>`;
    const userScript = jsName ? `<script>\n${files[jsName]}\n//# sourceURL=${jsName.replace(/[\r\n]/g, "")}\n</script>` : "";
    const injection = `${bridge}${userScript}`;
    return /<\/body\s*>/i.test(html)
      ? html.replace(/<\/body\s*>/i, `${injection}\n</body>`)
      : `${html}\n${injection}`;
  }

  function runPreview() {
    if (!Object.hasOwn(files, "index.html")) {
      elements.previewEmpty.hidden = false;
      elements.previewState.textContent = "No index.html";
      return;
    }
    previewLogs = [];
    renderConsole();
    elements.previewEmpty.hidden = true;
    elements.previewState.textContent = "Up to date";
    elements.previewFrame.srcdoc = createPreviewDocument();
    $("#statusMessage").textContent = "Preview updated.";
  }

  function renderConsole() {
    if (activePanel !== "console") return;
    elements.panelContent.replaceChildren();
    if (!previewLogs.length) {
      const empty = document.createElement("div");
      empty.className = "console-empty";
      empty.textContent = "Console is clear. Messages from your preview will appear here.";
      elements.panelContent.append(empty);
      return;
    }
    const list = document.createElement("div");
    list.className = "console-list";
    previewLogs.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "console-line";
      const kind = document.createElement("span");
      kind.className = `console-kind${entry.type === "error" ? " error" : entry.type === "warn" ? " warn" : ""}`;
      kind.textContent = entry.type.toUpperCase();
      const message = document.createElement("span");
      message.textContent = entry.message;
      row.append(kind, message);
      list.append(row);
    });
    elements.panelContent.append(list);
  }

  function switchPanel(name) {
    activePanel = name;
    document.querySelectorAll(".panel-tab").forEach((tab) => tab.classList.remove("active"));
    if (name === "problems") document.querySelector(".panel-tab").classList.add("active");
    else if (name === "console") $("#consoleTab").classList.add("active");
    else $("#outputTab").classList.add("active");
    if (name === "console") renderConsole();
    else {
      elements.panelContent.replaceChildren();
      const content = document.createElement("div");
      content.className = "empty-problems";
      const icon = document.createElement("span");
      icon.className = "check-badge";
      icon.textContent = "✓";
      const message = document.createElement("span");
      message.innerHTML = name === "problems"
        ? "<strong>Looking good.</strong> No problems detected in your workspace."
        : "<strong>Workspace ready.</strong> Your files are stored locally in this browser.";
      content.append(icon, message);
      elements.panelContent.append(content);
    }
  }

  function addFile(name) {
    const normalized = name.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
      elements.dialogError.textContent = "Enter a valid file name.";
      return false;
    }
    if (Object.hasOwn(files, normalized)) {
      elements.dialogError.textContent = "A file with that name already exists.";
      return false;
    }
    files[normalized] = extension(normalized) === "html"
      ? `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>New page</title>\n</head>\n<body>\n  <h1>New page</h1>\n</body>\n</html>`
      : extension(normalized) === "css" ? "/* Add your styles here */\n"
      : ["js", "mjs", "cjs"].includes(extension(normalized)) ? "// Start building something great.\n"
      : extension(normalized) === "json" ? "{\n  \n}\n" : "";
    activeFile = normalized;
    if (!openFiles.includes(normalized)) openFiles.push(normalized);
    elements.modal.hidden = true;
    elements.dialogError.textContent = "";
    openFile(normalized);
    markChanged();
    persistProject(false);
    toast(`Created ${normalized}`);
    return true;
  }

  function showFileDialog() {
    elements.modal.hidden = false;
    elements.fileNameInput.value = "";
    elements.dialogError.textContent = "";
    elements.fileNameInput.focus();
  }

  function downloadFile() {
    const blob = new Blob([files[activeFile]], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFile.split("/").pop();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Downloaded ${anchor.download}`);
  }

  function findNext() {
    const query = elements.findInput.value;
    if (!query) return;
    const source = elements.codeInput.value;
    const start = elements.codeInput.selectionEnd;
    let index = source.toLowerCase().indexOf(query.toLowerCase(), start);
    if (index === -1) index = source.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) {
      toast(`No matches for “${query}”`);
      return;
    }
    elements.codeInput.focus();
    elements.codeInput.setSelectionRange(index, index + query.length);
  }

  function readProject() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error("Could not read browser storage.", error);
      toast("Browser storage is unavailable. Your project will only last for this session.", 4500);
      return;
    }
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved || !saved.files || typeof saved.files !== "object" || Array.isArray(saved.files) ||
        !Object.entries(saved.files).every(([name, contents]) => typeof name === "string" && typeof contents === "string")) {
        throw new TypeError("Saved project has an invalid format.");
      }
      files = saved.files;
      if (saved.gitBaseFiles && typeof saved.gitBaseFiles === "object" && !Array.isArray(saved.gitBaseFiles) &&
        Object.values(saved.gitBaseFiles).every((contents) => typeof contents === "string")) {
        gitBaseFiles = saved.gitBaseFiles;
      } else {
        gitBaseFiles = { ...files };
      }
      stagedFiles = new Set(Array.isArray(saved.stagedFiles) ? saved.stagedFiles.filter((name) => typeof name === "string" && Object.hasOwn(files, name)) : []);
      gitHistory = Array.isArray(saved.gitHistory) ? saved.gitHistory.filter((entry) =>
        entry && typeof entry.message === "string" && typeof entry.date === "string").slice(0, 25) : [];
      installedExtensions = new Set(Array.isArray(saved.installedExtensions)
        ? saved.installedExtensions.filter((id) => extensionCatalog.some((item) => item.id === id)) : []);
      if (saved.accountProfile && typeof saved.accountProfile === "object") {
        accountProfile = {
          name: typeof saved.accountProfile.name === "string" ? saved.accountProfile.name : "Studio User",
          email: typeof saved.accountProfile.email === "string" ? saved.accountProfile.email : "",
          handle: typeof saved.accountProfile.handle === "string" ? saved.accountProfile.handle : ""
        };
      }
      activeFile = Object.hasOwn(files, saved.activeFile) ? saved.activeFile : Object.keys(files)[0];
      openFiles = Array.isArray(saved.openFiles) ? saved.openFiles.filter((name) => Object.hasOwn(files, name)) : [activeFile];
      if (!Object.keys(files).length) {
        files = { ...defaultFiles };
        activeFile = "index.html";
        openFiles = ["index.html", "styles.css", "script.js"];
      }
      savedSnapshot = getSnapshot();
    } catch (error) {
      console.error("Could not load saved project.", error);
      toast("Saved project data is invalid. Started a fresh workspace.", 4500);
      files = { ...defaultFiles };
      activeFile = "index.html";
      openFiles = ["index.html", "styles.css", "script.js"];
    }
  }

  function changedFiles() {
    return Object.keys(files).filter((name) => !Object.hasOwn(gitBaseFiles, name) || files[name] !== gitBaseFiles[name]);
  }

  function persistToolState() {
    persistProject(false);
  }

  function makeToolHeader(title, subtitle) {
    const header = document.createElement("div");
    header.className = "tool-panel-heading";
    const heading = document.createElement("span");
    heading.textContent = title;
    const description = document.createElement("small");
    description.textContent = subtitle;
    header.append(heading, description);
    return header;
  }

  function updateAccountAvatar() {
    const initial = accountProfile.name.trim().charAt(0).toUpperCase() || "S";
    $(".avatar").textContent = initial;
    $(".account-rail-avatar").textContent = initial;
  }

  function renderSourceControl(container) {
    const changed = changedFiles();
    const staged = changed.filter((name) => stagedFiles.has(name));
    container.append(makeToolHeader("SOURCE CONTROL", "Track a local commit history for this browser project."));
    const disclaimer = document.createElement("div");
    disclaimer.className = "tool-info-card";
    disclaimer.textContent = "Local Git-style history only. This workspace is not connected to a Git repository or remote.";
    container.append(disclaimer);

    const form = document.createElement("form");
    form.className = "tool-form";
    form.id = "commitForm";
    const message = document.createElement("input");
    message.className = "tool-input";
    message.name = "message";
    message.placeholder = "Commit message";
    message.maxLength = 120;
    message.setAttribute("aria-label", "Commit message");
    const commit = document.createElement("button");
    commit.className = "tool-primary-button";
    commit.type = "submit";
    commit.disabled = staged.length === 0;
    commit.textContent = `Commit staged (${staged.length})`;
    form.append(message, commit);
    container.append(form);

    const changesHeading = document.createElement("div");
    changesHeading.className = "tool-section-heading";
    const changesLabel = document.createElement("span");
    changesLabel.textContent = `CHANGES (${changed.length})`;
    changesHeading.append(changesLabel);
    if (changed.length > 0) {
      const stageAll = document.createElement("button");
      stageAll.type = "button";
      stageAll.className = "tool-text-button";
      stageAll.dataset.action = "stage-all";
      stageAll.textContent = "Stage all";
      changesHeading.append(stageAll);
    }
    container.append(changesHeading);
    if (changed.length === 0) {
      const empty = document.createElement("div");
      empty.className = "tool-empty";
      empty.textContent = "Working tree clean. Your files match the last local commit.";
      container.append(empty);
    }
    changed.forEach((name) => {
      const row = document.createElement("div");
      row.className = "tool-file-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = stagedFiles.has(name);
      checkbox.dataset.stageFile = name;
      checkbox.setAttribute("aria-label", `Stage ${name}`);
      const file = document.createElement("span");
      file.className = "tool-file-name";
      file.textContent = name;
      const status = document.createElement("span");
      status.className = `git-file-status ${Object.hasOwn(gitBaseFiles, name) ? "modified" : "added"}`;
      status.textContent = Object.hasOwn(gitBaseFiles, name) ? "M" : "A";
      row.append(checkbox, file, status);
      container.append(row);
    });
    if (gitHistory.length) {
      const heading = document.createElement("div");
      heading.className = "tool-section-heading history-heading";
      heading.textContent = `LOCAL HISTORY (${gitHistory.length})`;
      container.append(heading);
      gitHistory.slice(0, 10).forEach((entry) => {
        const row = document.createElement("div");
        row.className = "commit-row";
        const marker = document.createElement("span");
        marker.className = "commit-marker";
        marker.textContent = "●";
        const text = document.createElement("span");
        text.className = "commit-message";
        text.textContent = entry.message;
        const date = document.createElement("time");
        date.textContent = new Date(entry.date).toLocaleDateString();
        row.append(marker, text, date);
        container.append(row);
      });
    }
  }

  function renderExtensions(container, query = "") {
    const heading = makeToolHeader("EXTENSIONS", "Optional local editor add-ons. No third-party code is downloaded or executed.");
    container.replaceChildren(heading);
    const search = document.createElement("input");
    search.className = "tool-input extension-search";
    search.type = "search";
    search.placeholder = "Search extensions";
    search.value = query;
    search.setAttribute("aria-label", "Search extensions");
    container.append(search);
    const list = document.createElement("div");
    list.className = "extension-list";
    const filtered = extensionCatalog.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "tool-empty";
      empty.textContent = "No extensions match that search.";
      list.append(empty);
    }
    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "extension-card";
      const icon = document.createElement("span");
      icon.className = `extension-icon ${item.color}`;
      icon.textContent = item.icon;
      const content = document.createElement("div");
      content.className = "extension-copy";
      const title = document.createElement("strong");
      title.textContent = item.name;
      const publisher = document.createElement("small");
      publisher.textContent = item.publisher;
      const description = document.createElement("p");
      description.textContent = item.description;
      content.append(title, publisher, description);
      const button = document.createElement("button");
      button.className = "extension-toggle";
      button.type = "button";
      button.dataset.extensionId = item.id;
      button.textContent = installedExtensions.has(item.id) ? "Remove" : "Add";
      button.setAttribute("aria-pressed", String(installedExtensions.has(item.id)));
      card.append(icon, content, button);
      list.append(card);
    });
    container.append(list);
  }

  function renderDebugPanel(container) {
    container.append(makeToolHeader("RUN & DEBUG", "Execute browser code in a sandboxed preview frame."));
    const safety = document.createElement("div");
    safety.className = "tool-info-card";
    safety.textContent = "JavaScript runs locally in an isolated iframe. Use the browser developer tools for stepping, breakpoints, and variable inspection.";
    container.append(safety);
    const run = document.createElement("button");
    run.className = "tool-primary-button debug-run-button";
    run.type = "button";
    run.dataset.action = "debug-run";
    run.textContent = activeFile === "index.html" ? "▶  Run website preview" : `▶  Run ${activeFile}`;
    container.append(run);
    const docs = document.createElement("a");
    docs.className = "tool-link";
    docs.href = "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/debugger";
    docs.target = "_blank";
    docs.rel = "noreferrer";
    docs.textContent = "Add a debugger; statement to pause in DevTools ↗";
    container.append(docs);
    const output = document.createElement("div");
    output.className = "debug-output";
    output.innerHTML = "<span class=\"debug-status-dot\"></span><span>Run a file to see output in the Console panel.</span>";
    container.append(output);
  }

  function renderAccount(container) {
    container.append(makeToolHeader("ACCOUNT", "A local profile for this browser workspace."));
    const card = document.createElement("div");
    card.className = "account-card";
    const avatar = document.createElement("div");
    avatar.className = "account-large-avatar";
    avatar.textContent = (accountProfile.name.trim()[0] || "S").toUpperCase();
    const name = document.createElement("strong");
    name.textContent = accountProfile.name;
    const email = document.createElement("small");
    email.textContent = accountProfile.email || "No email added";
    card.append(avatar, name, email);
    container.append(card);
    const form = document.createElement("form");
    form.id = "accountForm";
    form.className = "tool-form account-form";
    [["name", "Display name", accountProfile.name, "text"], ["email", "Email (optional)", accountProfile.email, "email"], ["handle", "GitHub username (optional)", accountProfile.handle, "text"]].forEach(([key, label, value, type]) => {
      const field = document.createElement("label");
      field.className = "tool-field";
      field.textContent = label;
      const input = document.createElement("input");
      input.className = "tool-input";
      input.name = key;
      input.type = type;
      input.value = value;
      input.maxLength = key === "name" ? 60 : 100;
      input.required = key === "name";
      field.append(input);
      form.append(field);
    });
    const save = document.createElement("button");
    save.className = "tool-primary-button";
    save.type = "submit";
    save.textContent = "Save local profile";
    form.append(save);
    container.append(form);
    const notice = document.createElement("div");
    notice.className = "tool-info-card";
    notice.textContent = "This profile is stored only in this browser. Sign-in and account sync are not enabled.";
    container.append(notice);
    if (accountProfile.handle) {
      const profileLink = document.createElement("a");
      profileLink.className = "tool-link";
      profileLink.href = `https://github.com/${encodeURIComponent(accountProfile.handle)}`;
      profileLink.target = "_blank";
      profileLink.rel = "noreferrer";
      profileLink.textContent = `View @${accountProfile.handle} on GitHub ↗`;
      container.append(profileLink);
    }
  }

  function renderRemotePanel(container) {
    container.append(makeToolHeader("REMOTE EXPLORER", "Browse public GitHub repositories. No sign-in required."));
    const form = document.createElement("form");
    form.className = "tool-form remote-search-form";
    form.id = "remoteSearchForm";
    const query = document.createElement("input");
    query.className = "tool-input";
    query.type = "search";
    query.name = "query";
    query.placeholder = "Repository or topic";
    query.required = true;
    query.maxLength = 100;
    query.setAttribute("aria-label", "Search public repositories");
    const submit = document.createElement("button");
    submit.className = "tool-primary-button";
    submit.type = "submit";
    submit.textContent = "Search";
    form.append(query, submit);
    container.append(form);
    const hint = document.createElement("div");
    hint.className = "tool-info-card";
    hint.textContent = "Searches the public GitHub API. Rate limits and network availability apply.";
    container.append(hint);
    const results = document.createElement("div");
    results.className = "remote-results";
    results.id = "remoteResults";
    const initial = document.createElement("div");
    initial.className = "tool-empty";
    initial.textContent = "Search for public projects to explore.";
    results.append(initial);
    container.append(results);
  }

  function renderToolSidebar(tool) {
    activeTool = tool;
    $("#explorerView").hidden = tool !== "explorer";
    const view = $("#toolSidebarView");
    view.hidden = tool === "explorer";
    document.querySelectorAll(".tool-rail").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool);
    });
    if (tool === "explorer") {
      document.querySelector(".rail-button[aria-label='Explorer']").classList.add("active");
      return;
    }
    document.querySelector(".rail-button[aria-label='Explorer']").classList.remove("active");
    view.replaceChildren();
    if (tool === "source") renderSourceControl(view);
    else if (tool === "extensions") renderExtensions(view);
    else if (tool === "debug") renderDebugPanel(view);
    else if (tool === "account") renderAccount(view);
    else if (tool === "remote") renderRemotePanel(view);
    if (window.matchMedia("(max-width: 760px)").matches) $("#sidebar").classList.add("mobile-open");
  }

  function commitStaged(message) {
    const staged = changedFiles().filter((name) => stagedFiles.has(name));
    if (!staged.length) {
      toast("Stage at least one changed file before committing.");
      return false;
    }
    const summary = message.trim();
    if (!summary) {
      toast("Enter a commit message first.");
      return false;
    }
    gitBaseFiles = { ...gitBaseFiles, ...Object.fromEntries(staged.map((name) => [name, files[name]])) };
    gitHistory.unshift({ message: summary, date: new Date().toISOString(), files: staged.length });
    gitHistory = gitHistory.slice(0, 25);
    staged.forEach((name) => stagedFiles.delete(name));
    persistToolState();
    renderToolSidebar("source");
    toast(`Committed ${staged.length} file${staged.length === 1 ? "" : "s"} locally.`);
    return true;
  }

  function renderRemoteResults(results, repositories) {
    results.replaceChildren();
    if (!repositories.length) {
      const empty = document.createElement("div");
      empty.className = "tool-empty";
      empty.textContent = "No public repositories found.";
      results.append(empty);
      return;
    }
    repositories.forEach((repository) => {
      const card = document.createElement("article");
      card.className = "remote-card";
      const title = document.createElement("a");
      title.className = "remote-title";
      title.href = repository.html_url;
      title.target = "_blank";
      title.rel = "noreferrer";
      title.textContent = repository.full_name;
      const description = document.createElement("p");
      description.textContent = repository.description || "No description provided.";
      const meta = document.createElement("div");
      meta.className = "remote-meta";
      meta.textContent = `★ ${repository.stargazers_count.toLocaleString()}  ·  ${repository.language || "Unspecified"}`;
      card.append(title, description, meta);
      results.append(card);
    });
  }

  async function searchRemoteRepositories(query, results, button) {
    if (!navigator.onLine) {
      results.replaceChildren();
      const offline = document.createElement("div");
      offline.className = "tool-error";
      offline.textContent = "You appear to be offline. Reconnect to search public repositories.";
      results.append(offline);
      return;
    }
    if (remoteAbortController) remoteAbortController.abort();
    remoteAbortController = new AbortController();
    button.disabled = true;
    button.textContent = "Searching…";
    results.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "tool-empty";
    loading.textContent = "Searching public repositories…";
    results.append(loading);
    try {
      const response = await fetch(`${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=12`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: remoteAbortController.signal
      });
      if (!response.ok) throw new Error(response.status === 403 ? "GitHub API rate limit reached. Try again later." : `GitHub returned ${response.status}.`);
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error("GitHub returned an unexpected search response.");
      renderRemoteResults(results, data.items);
    } catch (error) {
      if (error.name === "AbortError") return;
      results.replaceChildren();
      const message = document.createElement("div");
      message.className = "tool-error";
      message.textContent = error instanceof TypeError
        ? "Could not reach GitHub. Check your connection or browser network permissions."
        : error.message;
      results.append(message);
    } finally {
      if (!remoteAbortController.signal.aborted) {
        button.disabled = false;
        button.textContent = "Search";
      }
    }
  }

  function runCurrentFile(debugging = false) {
    if (activeFile === "index.html") {
      runPreview();
      if (debugging) {
        switchPanel("console");
        $("#statusMessage").textContent = "Website preview started in an isolated browser frame.";
      }
      return;
    }
    if (!["js", "mjs", "cjs"].includes(extension(activeFile))) {
      toast("Run the website from index.html or select a JavaScript file.");
      return;
    }
    elements.previewPanel.hidden = false;
    if (window.matchMedia("(max-width: 760px)").matches) {
      elements.previewPanel.classList.add("mobile-visible");
      elements.previewPanel.classList.remove("mobile-hidden");
    }
    runPreview();
    elements.previewState.textContent = debugging ? "Debug session" : "Project running";
    $("#statusMessage").textContent = `${debugging ? "Debugging" : "Running"} ${activeFile} in an isolated browser frame.`;
    switchPanel("console");
    if (debugging) renderToolSidebar("debug");
  }

  function saveAccountProfile(form) {
    const data = new FormData(form);
    accountProfile = {
      name: String(data.get("name") || "").trim() || "Studio User",
      email: String(data.get("email") || "").trim(),
      handle: String(data.get("handle") || "").trim().replace(/^@/, "")
    };
    updateAccountAvatar();
    persistToolState();
    renderToolSidebar("account");
    toast("Local profile saved in this browser.");
  }

  elements.codeInput.addEventListener("input", updateActiveContent);
  elements.codeInput.addEventListener("scroll", () => {
    elements.highlightLayer.scrollTop = elements.codeInput.scrollTop;
    elements.highlightLayer.scrollLeft = elements.codeInput.scrollLeft;
    elements.lineNumbers.scrollTop = elements.codeInput.scrollTop;
  });
  ["click", "keyup", "select"].forEach((eventName) => elements.codeInput.addEventListener(eventName, updateCursor));
  elements.codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = elements.codeInput.selectionStart;
      const end = elements.codeInput.selectionEnd;
      elements.codeInput.setRangeText("  ", start, end, "end");
      updateActiveContent();
    }
  });

  elements.fileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addFile(elements.fileNameInput.value);
  });
  $("#newFileButton").addEventListener("click", showFileDialog);
  $("#dialogClose").addEventListener("click", () => { elements.modal.hidden = true; });
  $("#dialogCancel").addEventListener("click", () => { elements.modal.hidden = true; });
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) elements.modal.hidden = true;
  });
  $("#saveButton").addEventListener("click", () => persistProject(true));
  $("#downloadButton").addEventListener("click", downloadFile);
  $("#runButton").addEventListener("click", () => runCurrentFile(false));
  $("#debugButton").addEventListener("click", () => {
    renderToolSidebar("debug");
    runCurrentFile(true);
  });
  $("#refreshPreviewButton").addEventListener("click", () => {
    if (activeFile === "index.html") runPreview();
    else openFile("index.html");
  });
  $("#openPreviewButton").addEventListener("click", () => {
    if (activeFile !== "index.html") {
      toast("Open index.html before opening the preview.");
      return;
    }
    const blob = new Blob([createPreviewDocument()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open(url, "_blank", "noopener");
    if (!previewWindow) toast("Your browser blocked the preview tab. Allow pop-ups and try again.");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  $("#togglePreviewButton").addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      elements.previewPanel.classList.toggle("mobile-visible");
      elements.previewPanel.classList.toggle("mobile-hidden", !elements.previewPanel.classList.contains("mobile-visible"));
    } else {
      elements.previewPanel.hidden = !elements.previewPanel.hidden;
    }
  });
  $("#folderToggle").addEventListener("click", () => {
    elements.fileList.hidden = !elements.fileList.hidden;
  });
  $("#outlineToggle").addEventListener("click", () => {
    const isOpen = elements.outlineList.hidden;
    elements.outlineList.hidden = !isOpen;
    $(".section-caret").textContent = isOpen ? "⌄" : "›";
  });
  $("#toggleBottomButton").addEventListener("click", () => {
    $("#bottomPanel").classList.toggle("collapsed");
    $("#toggleBottomButton").textContent = $("#bottomPanel").classList.contains("collapsed") ? "⌃" : "⌄";
  });
  $("#consoleTab").addEventListener("click", () => switchPanel("console"));
  $("#outputTab").addEventListener("click", () => switchPanel("output"));
  document.querySelector(".panel-tab").addEventListener("click", () => switchPanel("problems"));
  $("#clearConsoleButton").addEventListener("click", () => {
    previewLogs = [];
    renderConsole();
    $("#consoleIndicator").style.background = "#55545f";
  });
  $("#searchFocusButton").addEventListener("click", () => elements.findInput.focus());
  document.querySelectorAll(".tool-rail").forEach((button) => {
    button.addEventListener("click", () => renderToolSidebar(button.dataset.tool));
  });
  document.querySelector(".rail-button[aria-label='Explorer']").addEventListener("click", () => {
    const sidebar = $("#sidebar");
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    if (activeTool !== "explorer") {
      renderToolSidebar("explorer");
      if (isMobile) sidebar.classList.add("mobile-open");
      else sidebar.classList.remove("collapsed");
    } else if (isMobile) {
      sidebar.classList.toggle("mobile-open");
    } else {
      sidebar.classList.toggle("collapsed");
    }
  });
  $("#toolSidebarView").addEventListener("change", (event) => {
    if (event.target.matches("[data-stage-file]")) {
      const name = event.target.dataset.stageFile;
      if (event.target.checked) stagedFiles.add(name);
      else stagedFiles.delete(name);
      persistToolState();
      renderToolSidebar("source");
    }
  });
  $("#toolSidebarView").addEventListener("input", (event) => {
    if (event.target.matches(".extension-search")) {
      const query = event.target.value;
      renderExtensions($("#toolSidebarView"), query);
      const search = $(".extension-search");
      search.focus();
      search.setSelectionRange(query.length, query.length);
    }
  });
  $("#toolSidebarView").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.action === "stage-all") {
      changedFiles().forEach((name) => stagedFiles.add(name));
      persistToolState();
      renderToolSidebar("source");
    } else if (button.dataset.action === "debug-run") {
      runCurrentFile(true);
    } else if (button.dataset.extensionId) {
      const id = button.dataset.extensionId;
      if (installedExtensions.has(id)) installedExtensions.delete(id);
      else installedExtensions.add(id);
      persistToolState();
      const query = $(".extension-search")?.value || "";
      renderExtensions($("#toolSidebarView"), query);
      toast(installedExtensions.has(id) ? "Extension enabled for this browser." : "Extension removed from this browser.");
    }
  });
  $("#toolSidebarView").addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.id === "commitForm") {
      commitStaged(new FormData(event.target).get("message").toString());
    } else if (event.target.id === "accountForm") {
      saveAccountProfile(event.target);
    } else if (event.target.id === "remoteSearchForm") {
      const data = new FormData(event.target);
      searchRemoteRepositories(String(data.get("query") || "").trim(), $("#remoteResults"), event.target.querySelector("button[type='submit']"));
    }
  });
  $("#findInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") findNext();
    if (event.key === "Escape") {
      elements.findInput.value = "";
      elements.codeInput.focus();
    }
  });
  $("#findInput").addEventListener("input", () => {
    if (!elements.findInput.value) return;
    const index = elements.codeInput.value.toLowerCase().indexOf(elements.findInput.value.toLowerCase());
    if (index >= 0) elements.codeInput.setSelectionRange(index, index + elements.findInput.value.length);
  });
  $("#themeButton").addEventListener("click", () => {
    isLightTheme = !isLightTheme;
    document.body.classList.toggle("light-theme", isLightTheme);
  });
  $("#settingsButton").addEventListener("click", () => toast("Settings are saved locally with your browser workspace."));
  $("#shortcutsButton").addEventListener("click", () => toast("Shortcuts: Ctrl/⌘ + S save · Ctrl/⌘ + Enter run · Ctrl/⌘ + F find", 4200));
  $(".avatar").addEventListener("click", () => renderToolSidebar("account"));
  $("#moreButton").addEventListener("click", () => toast("Tip: create, edit, and download files from your workspace."));
  $("#panelMessage").addEventListener("click", () => switchPanel("problems"));
  $("#statusErrors").addEventListener("click", () => switchPanel("problems"));
  $(".status-branch").addEventListener("click", () => renderToolSidebar("source"));
  $("#projectName").addEventListener("click", () => renderToolSidebar("account"));

  window.addEventListener("message", (event) => {
    if (event.source !== elements.previewFrame.contentWindow || !event.data ||
      event.data.source !== "studio-preview" || event.data.runId !== previewRunId) return;
    const entry = { type: event.data.type, message: String(event.data.message).slice(0, 1500) };
    previewLogs.push(entry);
    if (previewLogs.length > 100) previewLogs.shift();
    if (entry.type === "error") {
      $("#consoleIndicator").style.background = "#ef8581";
      $("#statusErrors").textContent = "⚠ 1";
    } else if (entry.type === "warn" && $("#consoleIndicator").style.background !== "rgb(239, 133, 129)") {
      $("#consoleIndicator").style.background = "#e7c074";
    } else if (entry.type === "log" || entry.type === "info") {
      $("#consoleIndicator").style.background = "#80d6ae";
    }
    renderConsole();
  });

  window.addEventListener("online", () => {
    $("#connectionLabel").textContent = "Online";
    $(".connection").classList.remove("offline");
    $("#statusMessage").textContent = "Back online. Your project is still saved locally.";
  });
  window.addEventListener("offline", () => {
    $("#connectionLabel").textContent = "Offline";
    $(".connection").classList.add("offline");
    $("#statusMessage").textContent = "Offline mode. Your project is available on this device.";
  });
  window.addEventListener("beforeunload", (event) => {
    if (Object.keys(files).some(isDirty)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  document.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier) {
      if (event.key === "Escape" && !elements.modal.hidden) elements.modal.hidden = true;
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      persistProject(true);
    } else if (key === "enter") {
      event.preventDefault();
      runCurrentFile(false);
    } else if (key === "f") {
      event.preventDefault();
      elements.findInput.focus();
      elements.findInput.select();
    }
  });

  readProject();
  updateAccountAvatar();
  renderFiles();
  renderTabs();
  openFile(activeFile);
  updateSaveButton();
  if (!navigator.onLine) {
    $("#connectionLabel").textContent = "Offline";
    $(".connection").classList.add("offline");
    $("#statusMessage").textContent = "Offline mode. Your project is available on this device.";
  }
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(() => {})
        .catch((error) => {
          console.error("Offline support could not be enabled.", error);
          toast("Could not enable offline app caching. Your locally saved project still works.", 4500);
        });
    });
  }
})();
