// automation-content.js — grava ações do usuário e reproduz automações na página
// Injetado dinamicamente via chrome.scripting.executeScript (não é content_script estático),
// e por isso precisa ser resiliente a múltiplas injeções na mesma aba.
(function () {
  if (window.__autoflowContentLoaded) return;
  window.__autoflowContentLoaded = true;

  let recording = false;
  let recordedSteps = [];
  let lastActionTime = 0;
  let overlayEl = null;
  let scrollDebounce = null;

  // ---------- Geração de seletor CSS robusto ----------

  function cssEscape(str) {
    if (window.CSS && CSS.escape) return CSS.escape(str);
    return str.replace(/([ #.;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
  }

  function cssEscapeAttr(str) {
    return String(str).replace(/"/g, '\\"');
  }

  function isUniqueSelector(sel) {
    try {
      return document.querySelectorAll(sel).length === 1;
    } catch (e) {
      return false;
    }
  }

  function generateSelector(el) {
    if (!(el instanceof Element)) return null;

    if (el.id && isUniqueSelector(`#${cssEscape(el.id)}`)) {
      return `#${cssEscape(el.id)}`;
    }

    const stableAttrs = ['data-testid', 'data-test', 'data-qa', 'name', 'aria-label'];
    for (const attr of stableAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const sel = `${el.tagName.toLowerCase()}[${attr}="${cssEscapeAttr(val)}"]`;
        if (isUniqueSelector(sel)) return sel;
      }
    }

    let path = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement) {
      let selector = node.tagName.toLowerCase();
      if (node.id) {
        selector = `#${cssEscape(node.id)}`;
        path.unshift(selector);
        break;
      } else {
        const parent = node.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
          if (siblings.length > 1) {
            const idx = siblings.indexOf(node) + 1;
            selector += `:nth-of-type(${idx})`;
          }
        }
        path.unshift(selector);
      }
      node = node.parentElement;
    }
    let fullSelector = path.join(' > ');
    if (isUniqueSelector(fullSelector)) return fullSelector;

    return fullSelector || el.tagName.toLowerCase();
  }

  function describeElement(el) {
    const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.placeholder || '')
      .trim()
      .slice(0, 60);
    return `${el.tagName.toLowerCase()}${text ? ': ' + text : ''}`;
  }

  // ---------- Gravação ----------

  function startRecording() {
    recording = true;
    recordedSteps = [];
    lastActionTime = Date.now();
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('scroll', onScroll, true);
    showOverlay();
  }

  function stopRecording() {
    recording = false;
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('change', onChange, true);
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('scroll', onScroll, true);
    hideOverlay();
  }

  function pushDelay() {
    const now = Date.now();
    const delay = Math.min(now - lastActionTime, 5000);
    lastActionTime = now;
    return delay;
  }

  function onClick(e) {
    if (!recording) return;
    if (overlayEl && overlayEl.contains(e.target)) return;
    const el = e.target;
    const selector = generateSelector(el);
    recordedSteps.push({ type: 'click', selector, label: describeElement(el), delay: pushDelay() });
    notifySidepanel();
  }

  function onInput(e) {
    if (!recording) return;
    const el = e.target;
    if (!('value' in el)) return;
    const selector = generateSelector(el);
    const last = recordedSteps[recordedSteps.length - 1];
    if (last && last.type === 'input' && last.selector === selector) {
      last.value = el.value;
      return;
    }
    recordedSteps.push({ type: 'input', selector, value: el.value, label: describeElement(el), delay: pushDelay() });
    notifySidepanel();
  }

  function onChange(e) {
    if (!recording) return;
    const el = e.target;
    if (el.tagName === 'SELECT') {
      const selector = generateSelector(el);
      recordedSteps.push({ type: 'select', selector, value: el.value, label: describeElement(el), delay: pushDelay() });
      notifySidepanel();
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      const selector = generateSelector(el);
      recordedSteps.push({ type: 'check', selector, checked: el.checked, label: describeElement(el), delay: pushDelay() });
      notifySidepanel();
    }
  }

  function onKeydown(e) {
    if (!recording) return;
    if (e.key === 'Enter') {
      const el = e.target;
      const selector = generateSelector(el);
      recordedSteps.push({ type: 'keypress', selector, key: 'Enter', label: describeElement(el), delay: pushDelay() });
      notifySidepanel();
    }
  }

  function onScroll() {
    if (!recording) return;
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      const last = recordedSteps[recordedSteps.length - 1];
      const y = window.scrollY;
      if (last && last.type === 'scroll') {
        last.y = y;
        return;
      }
      recordedSteps.push({ type: 'scroll', y, label: `Rolar até ${y}px`, delay: pushDelay() });
      notifySidepanel();
    }, 300);
  }

  function notifySidepanel() {
    chrome.runtime.sendMessage({ type: 'AUTOFLOW_RECORDING_UPDATE', steps: recordedSteps }).catch(() => {});
  }

  function showOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = 'autoflow-recording-overlay';
    overlayEl.innerHTML = `
      <style>
        #autoflow-recording-overlay {
          position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
          background: #1e1e2e; color: #fff; padding: 10px 16px; border-radius: 10px;
          font-family: -apple-system, Segoe UI, Roboto, sans-serif; font-size: 13px;
          box-shadow: 0 4px 16px rgba(0,0,0,.35); display: flex; align-items: center; gap: 10px;
        }
        #autoflow-recording-overlay .dot {
          width: 10px; height: 10px; border-radius: 50%; background: #ff4d4f;
          animation: autoflow-pulse 1.2s infinite;
        }
        @keyframes autoflow-pulse { 0%{opacity:1} 50%{opacity:.3} 100%{opacity:1} }
      </style>
      <span class="dot"></span>
      <span>Gravando automação…</span>
    `;
    document.documentElement.appendChild(overlayEl);
  }

  function hideOverlay() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  // ---------- Reprodução ----------

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function waitForSelector(selector, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(150);
    }
    return null;
  }

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function runAutomation(automation) {
    const steps = automation.steps || [];
    for (const step of steps) {
      const delay = Math.min(step.delay || 0, 2500);
      if (delay > 0) await sleep(delay);

      switch (step.type) {
        case 'click': {
          const el = await waitForSelector(step.selector);
          if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await sleep(150);
            el.click();
          }
          break;
        }
        case 'input': {
          const el = await waitForSelector(step.selector);
          if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            el.focus();
            setNativeValue(el, step.value ?? '');
          }
          break;
        }
        case 'select': {
          const el = await waitForSelector(step.selector);
          if (el) {
            el.value = step.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        }
        case 'check': {
          const el = await waitForSelector(step.selector);
          if (el && el.checked !== step.checked) {
            el.click();
          }
          break;
        }
        case 'keypress': {
          const el = await waitForSelector(step.selector);
          if (el) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: step.key, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: step.key, bubbles: true }));
            if (el.form && step.key === 'Enter') {
              el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit();
            }
          }
          break;
        }
        case 'scroll': {
          window.scrollTo({ top: step.y || 0, behavior: 'smooth' });
          break;
        }
        case 'wait': {
          await sleep(step.ms || 500);
          break;
        }
        case 'navigate': {
          window.location.href = step.url;
          return;
        }
        default:
          break;
      }
    }
  }

  // ---------- Extração de elementos interativos (para IA) ----------

  function extractInteractiveElements() {
    const selectors = 'a, button, input, select, textarea, [role=button], [onclick], [contenteditable=true]';
    const els = Array.from(document.querySelectorAll(selectors)).slice(0, 200);
    return els.map((el, idx) => {
      el.setAttribute('data-autoflow-idx', String(idx));
      return {
        idx,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        text: (el.innerText || '').trim().slice(0, 80),
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        name: el.getAttribute('name') || '',
        selector: generateSelector(el),
      };
    });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'AUTOFLOW_START_RECORDING') {
      startRecording();
      sendResponse({ ok: true });
    } else if (msg.type === 'AUTOFLOW_STOP_RECORDING') {
      stopRecording();
      sendResponse({ ok: true, steps: recordedSteps });
    } else if (msg.type === 'AUTOFLOW_GET_RECORDED_STEPS') {
      sendResponse({ steps: recordedSteps });
    } else if (msg.type === 'AUTOFLOW_RUN') {
      runAutomation(msg.automation)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true; // async
    } else if (msg.type === 'AUTOFLOW_EXTRACT_INTERACTIVE_ELEMENTS') {
      sendResponse({ elements: extractInteractiveElements() });
    }
    return true;
  });
})();
