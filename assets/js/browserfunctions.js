let aTab = 0;
let tabCounter = 1;
let bTabs = [];
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const wispUrl = localStorage.getItem("cherri_wispUrl") || "wss://wisp.rhw.one/";
const bareUrl = "https://useclassplay.vercel.app/fq/";

let searchE;
const se = localStorage.getItem("cherri_searchEngine") || "DuckDuckGo";

if (se === "DuckDuckGo") {
  searchE = "https://duckduckgo.com/search?q=";
} else if (se === "Bing") {
  searchE = "https://bing.com/search?q=";
} else if (se === "Google") {
  searchE = "https://google.com/search?q=";
} else if (se === "Startpage") {
  searchE = "https://startpage.com/search?q=";
} else if (se === "Qwant") {
  searchE = "https://qwant.com/search?q=";
} else {
  searchE = "https://search.brave.com/search?q=";
}

connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);

const CONFIG = {
  files: {
    wasm: "/homework/history.wasm.wasm",
    all: "/homework/math.all.js",
    sync: "/homework/science.sync.js",
  },
};

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: CONFIG.files,
});
scramjet.init();

function newTab() {
  const tabCont = document.querySelector(".tabs");
  const nTab = {
    id: tabCounter++,
    title: "New Tab",
    url: "",
    history: [],
    historyIndex: -1,
  };

  bTabs.push(nTab);
  if (!tabCont) return;

  const ntBtn = document.querySelector(".newtab");

  const tabElement = document.createElement("div");
  tabElement.classList.add("tab", "hcontainer");
  tabElement.dataset.tabId = nTab.id;
  tabElement.innerHTML = `
        <img src="/assets/img/fav.png" id="fav" data-fav-id="${nTab.id}" width="24" alt="">
            <span>
                New Tab
            </span>
        <i class="fas fa-times close-btn"></i>
        `;

  tabElement.addEventListener("click", (e) => {
    if (!e.target.closest(".close-btn")) {
      switchTab(nTab.id);
    }
  });

  const closebtn = tabElement.querySelector(".close-btn");
  closebtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeTab(nTab.id);
  });

  tabCont.insertBefore(tabElement, ntBtn);

  const tabFrame = document.createElement("iframe");
  tabFrame.classList.add("viewframe", "browser-frame");
  tabFrame.dataset.frameId = nTab.id;
  tabFrame.setAttribute("allowfullscreen", "true");
  tabFrame.src = "/newtab.html";

  document.body.appendChild(tabFrame);

  switchTab(nTab.id);
}

function switchTab(tId) {
  aTab = tId;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", parseInt(tab.dataset.tabId) === tId);
  });

  document.querySelectorAll(".viewframe").forEach((frame) => {
    frame.classList.toggle("active", parseInt(frame.dataset.frameId) === tId);
  });

  const cTab = bTabs.find((t) => t.id === tId);
  if (cTab) {
    const input = document.getElementById("searchbar");
    if (input) input.value = cTab.url;
  }
}

function closeTab(tId) {
  if (bTabs.length === 1) {
    showToast("error", "Cannot close last tab!", "fas fa-circle-xmark");
    return;
  }

  const tIndex = bTabs.findIndex((t) => t.id === tId);
  if (tIndex === -1) return;

  bTabs.splice(tIndex, 1);

  const tEl = document.querySelector(`.tab[data-tab-id="${tId}"]`);
  const frame = document.querySelector(`.viewframe[data-frame-id="${tId}"]`);

  if (tEl) tEl.remove();
  if (frame) frame.remove();

  if (aTab === tId) {
    const newATab = bTabs[Math.max(0, tIndex - 1)];
    if (newATab) {
      switchTab(newATab.id);
    }
  }
}

function nav(i) {
  console.log("e");
  if (!i.trim()) return;

  let url = i.trim();

  if (!url.includes(".") || url.includes(" ")) {
    url = searchE + encodeURIComponent(url);
  } else {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
  }

  const cTab = bTabs.find((t) => t.id === aTab);
  if (!cTab) return;

  cTab.history.push(url);
  cTab.historyIndex++;

  cTab.url = url;

  // Open the actual website directly in a new window
  window.open(url, '_blank');
}

function updateUrlFromIframe(viewframe) {
  try {
    const cTab = bTabs.find((t) => t.id === aTab);
    if (!cTab) return;

    let decodedUrl;
    const currentSrc = viewframe.src;

    if (localStorage.getItem("cherri_backend") === "Ultraviolet") {
      if (currentSrc.includes("/uv/service/")) {
        decodedUrl = __uv$config.decodeUrl(currentSrc.split("/uv/service/")[1]);
      }
    } else {
      decodedUrl = scramjet.decodeUrl(currentSrc);
    }

    if (decodedUrl && decodedUrl !== cTab.url) {
      cTab.url = decodedUrl;

      const ubar = document.getElementById("searchbar");
      if (ubar) ubar.value = decodedUrl;

      const favEl = document.querySelector(`#fav[data-fav-id="${aTab}"]`);
      if (favEl)
        favEl.src = `https://www.google.com/s2/favicons?domain=${decodedUrl}&sz=256`;
    }
  } catch (e) {
    console.error("Error updating URL from iframe:", e);
  }
}

async function go(u) {
  if (!(await connection.getTransport())) {
    connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
  }

  console.log("a");
  const cTab = bTabs.find((t) => t.id === aTab);
  const favEl = document.querySelector(`#fav[data-fav-id="${aTab}"]`);
  const viewframe = document.querySelector(
    `.viewframe[data-frame-id="${aTab}"]`
  );
  if (!viewframe) return;

  const ubar = document.getElementById("searchbar");

  const tabEl = document.querySelector(`.tab[data-tab-id="${aTab}"]`);
  if (tabEl) {
    const titleEl = tabEl.querySelector("span");
    if (titleEl) titleEl.textContent = "Loading...";
  }

  if (ubar) ubar.value = cTab.url;
  const favUrl = cTab.url;
  if (favEl)
    favEl.src = `https://www.google.com/s2/favicons?domain=${favUrl}&sz=256`;

  try {
    viewframe.src = u;
    console.log("ooooo");

    viewframe.onload = () => {
      try {
        const iframeDoc =
          viewframe.contentDocument || viewframe.contentWindow.document;
        const title = iframeDoc.title || new URL(cTab.url).hostname;

        const tabEl = document.querySelector(`.tab[data-tab-id="${aTab}"]`);
        if (tabEl) {
          const titleEl = tabEl.querySelector("span");
          if (titleEl) titleEl.textContent = title;
        }

        injectAddressBar(viewframe, cTab.url);
        updateUrlFromIframe(viewframe);
      } catch (e) {
        console.error("Error accessing iframe content:", e);
        const tabEl = document.querySelector(`.tab[data-tab-id="${aTab}"]`);
        if (tabEl) {
          const titleEl = tabEl.querySelector("span");
          if (titleEl) titleEl.textContent = new URL(cTab.url).hostname;
        }

        try {
          injectAddressBar(viewframe, cTab.url);
        } catch (e2) {
          console.log("Could not inject address bar");
        }
        updateUrlFromIframe(viewframe);
      }
    };
  } catch (e) {
    console.error("There was an error while loading the page:", e);
    showToast(
      "error",
      "There was a problem loading the page. Check the console for more info.",
      "fas fa-times-circle"
    );
  }
}

function b() {
  const cTab = bTabs.find((t) => t.id === aTab);
  if (!cTab || cTab.historyIndex <= 0) return;

  cTab.historyIndex--;
  const u = cTab.history[cTab.historyIndex];
  cTab.url = u;
  let furl;
  const ba = localStorage.getItem("cherri_backend");
  if (ba.toLowerCase() === "scramjet") {
    furl = scramjet.encodeUrl(u);
  } else if (ba.toLowerCase() === "ultraviolet") {
    furl = __uv$config.prefix + __uv$config.encodeUrl(u);
  } else {
    furl = scramjet.encodeUrl(u);
  }

  go(furl);
}

function f() {
  const cTab = bTabs.find((t) => t.id === aTab);

  cTab.historyIndex++;
  const u = cTab.history[cTab.historyIndex];
  cTab.url = u;
  let furl;
  const ba = localStorage.getItem("cherri_backend");
  if (ba.toLowerCase() === "scramjet") {
    furl = scramjet.encodeUrl(u);
  } else if (ba.toLowerCase() === "ultraviolet") {
    furl = __uv$config.prefix + __uv$config.encodeUrl(u);
  } else {
    furl = scramjet.encodeUrl(u);
  }

  go(furl);
}

function r() {
  const viewframe = document.querySelector(
    `.viewframe[data-frame-id="${aTab}"]`
  );
  const curl = viewframe.src;

  viewframe.src = curl;
}

function full() {
  const viewframe = document.querySelector(
    `.viewframe[data-frame-id="${aTab}"]`
  );
  viewframe.requestFullscreen();
  console.log("sdfkjhasdkjhfg");
}

function hideBrowser() {
  const b = document.querySelector(".browser-container");
  const frames = document.querySelectorAll(".viewframe");
  b.style.opacity = 0;
  frames.forEach((frame) => {
    frame.style.opacity = 0;
    frame.style.pointerEvents = "none";
  });
  b.style.pointerEvents = "none";
}

async function launchEruda() {
  showToast("info", "Launching Eruda...", "fas fa-info-circle");
  try {
    eruda.init();
    showToast(
      "success",
      "Successfully injected Eruda",
      "fa-solid fa-check-circle"
    );
  } catch (e) {
    showToast("error", "Failed to inject Eruda", "fas fa-times-circle");
  }
}

async function fixProxy() {
  await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);

  showToast("success", "Connection reset to Libcurl!", "fas fa-check-circle")
  console.log(
    "%c[SUCCESS]" + "%c Connection reset to Libcurl.",
    "color: lime; font-weight: bold;",
    "color: white; font-weight: normal;"
  );

  await navigator.serviceWorker.register("/sw.js")

  showToast("success", "Service workers reregistered. (1/2)", "fas fa-check-circle");
  console.log(
    "%c[SUCCESS]" + "%c Service workers reregistered. (1/2)",
    "color: lime; font-weight: bold;",
    "color: white; font-weight: normal;"
  );

  await navigator.serviceWorker.register("/uv/sw.js")

  showToast("success", "Service workers reregistered. (2/2)", "fas fa-check-circle");
  console.log(
    "%c[SUCCESS]" + "%c Service workers reregistered. (2/2)",
    "color: lime; font-weight: bold;",
    "color: white; font-weight: normal;"
  );
}

function injectAddressBar(viewframe, actualUrl) {
  try {
    const iframeDoc = viewframe.contentDocument || viewframe.contentWindow.document;
    if (!iframeDoc) return;

    // Remove existing address bar if present
    const existingBar = iframeDoc.getElementById("__cherri_address_bar");
    if (existingBar) existingBar.remove();

    // Create address bar container
    const addressBar = document.createElement("div");
    addressBar.id = "__cherri_address_bar";
    addressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 12px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      border-bottom: 2px solid #764ba2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
    `;

    // Create URL display
    const urlText = document.createElement("span");
    urlText.style.cssText = `
      flex: 1;
      word-break: break-all;
      opacity: 0.95;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    urlText.textContent = actualUrl;
    
    // Create copy button
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "📋";
    copyBtn.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      flex-shrink: 0;
    `;
    copyBtn.onmouseover = () => copyBtn.style.background = "rgba(255,255,255,0.3)";
    copyBtn.onmouseout = () => copyBtn.style.background = "rgba(255,255,255,0.2)";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(actualUrl);
      copyBtn.textContent = "✓";
      setTimeout(() => { copyBtn.textContent = "📋"; }, 1500);
    };

    addressBar.appendChild(urlText);
    addressBar.appendChild(copyBtn);

    // Insert at the beginning of body
    if (iframeDoc.body) {
      iframeDoc.body.insertBefore(addressBar, iframeDoc.body.firstChild);
      // Add padding to body to account for the fixed bar
      const currentPadding = parseInt(window.getComputedStyle(iframeDoc.body).paddingTop) || 0;
      iframeDoc.body.style.paddingTop = (currentPadding + 40) + "px";
    } else {
      // If body doesn't exist yet, try to add it to html
      iframeDoc.documentElement.insertBefore(addressBar, iframeDoc.documentElement.firstChild);
    }
  } catch (e) {
    console.log("Could not inject address bar:", e);
  }
}