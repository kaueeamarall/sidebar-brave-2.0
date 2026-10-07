(() => {
  const MAX_ITEMS = 50;
  const MAX_PAGE_CONTROLS = 50;
  const IMAGE_ATTRIBUTES = ["src", "currentSrc", "data-src", "data-lazy-src", "data-original"];
  const VIDEO_ATTRIBUTES = ["src", "currentSrc", "poster", "data-src", "data-video"];
  const trackedElements = new Map();
  const selected = new Map();
  let lastSnapshot = "";
  let toolbar;
  let previewDialog;
  let updateScheduled = false;
  let selectionMode = false;
  let lastHref = location.href;

  const siteName = location.hostname.replace(/^www\./, "").split(".")[0];

  function normalizeUrl(raw) {
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return null;
    try {
      const url = new URL(raw, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function addItem(items, seen, rawUrl, type, source = "page") {
    const url = normalizeUrl(rawUrl);
    if (!url || seen.has(url) || items.length >= MAX_ITEMS) return;
    seen.add(url);
    items.push({ url, type, source, title: document.title || siteName, site: siteName });
  }

  function collect() {
    const items = [];
    const seen = new Set();
    const settings = window.__socialDownloaderSettings || {};

    if (settings.includeImages !== false) {
      document.querySelectorAll("img").forEach((image) => {
        IMAGE_ATTRIBUTES.forEach((attribute) => addItem(items, seen, image.getAttribute(attribute), "image"));
      });
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((meta) => {
        addItem(items, seen, meta.content, "image", "metadata");
      });
    }

    if (settings.includeVideos !== false) {
      document.querySelectorAll("video, video source").forEach((video) => {
        VIDEO_ATTRIBUTES.forEach((attribute) => addItem(items, seen, video.getAttribute(attribute) || video[attribute], "video"));
      });
      document.querySelectorAll('meta[property="og:video"], meta[property="og:video:secure_url"], meta[name="twitter:player:stream"]').forEach((meta) => {
        addItem(items, seen, meta.content, "video", "metadata");
      });
    }

    if (settings.includeAudio === true) {
      document.querySelectorAll("audio, audio source").forEach((audio) => {
        addItem(items, seen, audio.currentSrc || audio.src || audio.getAttribute("src"), "audio");
      });
    }
    return items;
  }

  function publish(force = false) {
    const media = collect();
    const snapshot = JSON.stringify(media.map(({ url, type }) => [url, type]));
    if (!force && snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    chrome.runtime.sendMessage({ type: "media-found", media }).catch(() => {});
  }

  function directMedia(element) {
    const type = element.tagName.toLowerCase() === "video" ? "video" : "image";
    const attributes = type === "video" ? VIDEO_ATTRIBUTES : IMAGE_ATTRIBUTES;
    for (const attribute of attributes) {
      const url = normalizeUrl(element.getAttribute(attribute) || element[attribute]);
      if (url && (type === "video" || !url.endsWith(".svg"))) return { url, type };
    }
    return null;
  }

  function installPageUi() {
    if (!document.body || !selectionMode) return;
    if (!toolbar) createToolbar();

    const settings = window.__socialDownloaderSettings || {};
    const selector = [
      settings.includeImages !== false ? "img" : "",
      settings.includeVideos !== false ? "video" : ""
    ].filter(Boolean).join(",");

    if (!selector) return;
    const elements = [...document.querySelectorAll(selector)].slice(0, MAX_PAGE_CONTROLS);
    elements.forEach((element) => {
      const item = directMedia(element);
      if (!item || trackedElements.has(element)) return;
      const control = document.createElement("button");
      control.type = "button";
      control.className = "social-downloader-select";
      control.textContent = "✓";
      control.title = "Selecionar mídia";
      control.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSelection(element, item, control);
      });
      document.documentElement.appendChild(control);
      trackedElements.set(element, { control, item });
      positionControl(element, control);
    });
    updateControls();
  }

  function positionControl(element, control) {
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 25 && rect.height > 25 && rect.bottom > 0 && rect.top < innerHeight;
    control.style.display = visible ? "grid" : "none";
    if (visible) {
      control.style.left = `${Math.max(4, rect.left + 8)}px`;
      control.style.top = `${Math.max(4, rect.top + 8)}px`;
    }
  }

  function toggleSelection(element, item, control) {
    if (selected.has(item.url)) {
      selected.delete(item.url);
      control.classList.remove("selected");
    } else {
      selected.set(item.url, { ...item, element });
      control.classList.add("selected");
      openPreview(item);
    }
    updateControls();
  }

  function updateControls() {
    if (!toolbar) return;
    toolbar.querySelector(".social-downloader-count").textContent = `${selected.size} selecionada${selected.size === 1 ? "" : "s"}`;
    toolbar.querySelector(".social-downloader-download").disabled = selected.size === 0;
    trackedElements.forEach(({ control, item }) => {
      control.classList.toggle("selected", selected.has(item.url));
    });
  }

  function createToolbar() {
    toolbar = document.createElement("aside");
    toolbar.id = "social-downloader-toolbar";
    toolbar.innerHTML = `
      <strong>Downloader</strong>
      <span class="social-downloader-count">0 selecionadas</span>
      <button class="social-downloader-download" type="button" disabled>Baixar selecionadas</button>
      <button class="social-downloader-clear" type="button">Limpar</button>
      <button class="social-downloader-close" type="button" aria-label="Fechar seleção">×</button>
    `;
    toolbar.querySelector(".social-downloader-download").addEventListener("click", downloadSelected);
    toolbar.querySelector(".social-downloader-clear").addEventListener("click", () => {
      selected.clear();
      updateControls();
    });
    toolbar.querySelector(".social-downloader-close").addEventListener("click", disableSelectionMode);
    document.documentElement.appendChild(toolbar);
  }

  function disableSelectionMode() {
    selectionMode = false;
    clearPageUi();
  }

  function clearPageUi() {
    closePreview();
    selected.clear();
    trackedElements.forEach(({ control }) => control.remove());
    trackedElements.clear();
    toolbar?.remove();
    toolbar = null;
    lastSnapshot = "";
    observer.disconnect();
  }

  function enableSelectionMode() {
    selectionMode = true;
    if (!toolbar) createToolbar();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    installPageUi();
  }

  function detectNavigation() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    clearPageUi();
  }

  function openPreview(item) {
    closePreview();
    previewDialog = document.createElement("div");
    previewDialog.className = "social-downloader-preview";
    previewDialog.innerHTML = `
      <div class="social-downloader-preview-card" role="dialog" aria-modal="true">
        <button class="social-downloader-preview-close" type="button" aria-label="Fechar">×</button>
        <div class="social-downloader-preview-content"></div>
        <div class="social-downloader-preview-actions">
          <span>${item.type === "video" ? "Vídeo" : "Imagem"} selecionado</span>
          <button class="social-downloader-preview-download" type="button">Baixar agora</button>
        </div>
      </div>
    `;
    const content = previewDialog.querySelector(".social-downloader-preview-content");
    const mediaElement = document.createElement(item.type === "video" ? "video" : "img");
    mediaElement.src = item.url;
    mediaElement.controls = item.type === "video";
    mediaElement.autoplay = item.type === "video";
    mediaElement.alt = "Pré-visualização da mídia";
    content.appendChild(mediaElement);
    previewDialog.querySelector(".social-downloader-preview-close").addEventListener("click", closePreview);
    previewDialog.addEventListener("click", (event) => {
      if (event.target === previewDialog) closePreview();
    });
    previewDialog.querySelector(".social-downloader-preview-download").addEventListener("click", () => {
      startDownload(item);
    });
    document.documentElement.appendChild(previewDialog);
  }

  function closePreview() {
    previewDialog?.remove();
    previewDialog = null;
  }

  async function startDownload(item, index = 0) {
    const settings = await chrome.storage.local.get({ filenamePrefix: "social-media" });
    const response = await chrome.runtime.sendMessage({
      type: "download-media",
      url: item.url,
      mediaType: item.type,
      index,
      prefix: settings.filenamePrefix
    });
    if (!response?.ok) window.alert(response?.error || "Não foi possível iniciar o download.");
  }

  async function downloadSelected() {
    const items = [...selected.values()];
    const concurrency = 4;
    for (let start = 0; start < items.length; start += concurrency) {
      const batch = items.slice(start, start + concurrency);
      await Promise.all(batch.map((item, offset) => startDownload(item, start + offset)));
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "enable-selection-mode") {
      enableSelectionMode();
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "scan-page") {
      sendResponse({ media: collect(), title: document.title, site: siteName, selected: [...selected.keys()] });
    }
  });

  function schedulePageUpdate() {
    if (updateScheduled) return;
    updateScheduled = true;
    window.setTimeout(() => {
      updateScheduled = false;
      publish();
      installPageUi();
    }, 500);
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => (
      node.nodeType === Node.ELEMENT_NODE &&
      !node.closest?.("#social-downloader-toolbar, .social-downloader-select, .social-downloader-preview")
    )))) {
      schedulePageUpdate();
    }
  });
  let positionScheduled = false;
  function schedulePositionUpdate() {
    if (positionScheduled) return;
    positionScheduled = true;
    requestAnimationFrame(() => {
      positionScheduled = false;
      trackedElements.forEach(({ control }, element) => positionControl(element, control));
    });
  }
  window.addEventListener("scroll", schedulePositionUpdate, { passive: true });
  window.addEventListener("resize", schedulePositionUpdate);
  window.addEventListener("popstate", detectNavigation);
  window.addEventListener("hashchange", detectNavigation);
  chrome.storage.local.get({ includeImages: true, includeVideos: true, includeAudio: false }).then((settings) => {
    window.__socialDownloaderSettings = settings;
  });
})();
