// sidepanel/ai/content/content-script.js
// Injected into web pages to extract clean DOM content and perform interactive automation for the AI agent.

(() => {
  if (window.__sidebarAiContentScriptLoaded) return;
  window.__sidebarAiContentScriptLoaded = true;

  function highlightElement(el) {
    if (!el) return;
    el.classList.add('sidebar-ai-highlight');
    setTimeout(() => { el.classList.remove('sidebar-ai-highlight'); }, 2000);
  }

  function showActionToast(message) {
    const existing = document.querySelector('.sidebar-ai-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'sidebar-ai-toast';
    toast.innerHTML = `<span>⚡ Inteligência Artificial:</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 2400);
  }

  function extractPageContent(maxLength = 12000) {
    const title = document.title || 'Sem título';
    const url = window.location.href;
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

    const targetEl = document.querySelector('main, article, [role="main"]') || document.body;
    const clone = targetEl.cloneNode(true);

    const noiseSelectors = [
      'script', 'style', 'noscript', 'svg', 'iframe',
      'nav', 'footer', '.ads', '.cookie-banner', '#cookie-consent',
      '.sidebar', '[aria-hidden="true"]'
    ];
    noiseSelectors.forEach(sel => { clone.querySelectorAll(sel).forEach(el => el.remove()); });

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 15)
      .map(h => `${h.tagName}: ${h.innerText.trim()}`)
      .filter(h => h.length > 4);

    const forms = Array.from(document.querySelectorAll('form')).map((form, idx) => {
      const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
        tag: input.tagName.toLowerCase(),
        type: input.type || 'text',
        name: input.name || '',
        id: input.id || '',
        placeholder: input.placeholder || '',
        value: input.value ? '[preenchido]' : ''
      }));
      return { formIndex: idx, id: form.id, action: form.action, fields: inputs };
    });

    let rawText = clone.innerText || '';
    let cleanedText = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

    if (cleanedText.length > maxLength) {
      cleanedText = cleanedText.slice(0, maxLength) + '\n\n...[Conteúdo truncado no limite de tamanho]';
    }

    return { title, url, metaDescription: metaDesc, headings, formsSummary: forms, content: cleanedText };
  }

  function getInteractiveElements(customSelector) {
    const selector = customSelector || 'button, a[href], input, textarea, select, [role="button"]';
    const elements = Array.from(document.querySelectorAll(selector)).slice(0, 50);

    return elements.map((el, i) => {
      let path = el.tagName.toLowerCase();
      if (el.id) {
        path += `#${el.id}`;
      } else if (el.name) {
        path += `[name="${el.name}"]`;
      } else if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => !c.startsWith('sidebar-ai')).slice(0, 2);
        if (classes.length) path += `.${classes.join('.')}`;
      }

      const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim().slice(0, 50);

      return {
        index: i, tagName: el.tagName.toLowerCase(), selector: path, text,
        type: el.type || undefined, disabled: el.disabled || false, visible: el.offsetParent !== null
      };
    });
  }

  function clickElement({ selector, text }) {
    let target = null;

    if (selector) {
      try { target = document.querySelector(selector); } catch (e) { /* invalid selector, fall through */ }
    }

    if (!target && text) {
      const lower = text.toLowerCase();
      const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
      target = candidates.find(el => (el.innerText || el.value || '').toLowerCase().includes(lower));
    }

    if (!target) {
      return { success: false, error: `Elemento não encontrado com selector: "${selector || ''}" e texto: "${text || ''}"` };
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement(target);
    showActionToast(`Clicando em ${target.tagName.toLowerCase()}`);

    target.focus();
    target.click();

    return { success: true, message: `Elemento <${target.tagName.toLowerCase()}> clicado com sucesso.` };
  }

  function fillFormField({ selector, value, submit = false }) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: `Campo não encontrado pelo seletor: ${selector}` };

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement(el);
    el.focus();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (el.tagName.toLowerCase() === 'textarea' && nativeTextareaValueSetter) {
      nativeTextareaValueSetter.call(el, value);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    showActionToast(`Preenchendo ${selector}`);

    if (submit) {
      setTimeout(() => {
        const form = el.closest('form');
        if (form) {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
          else form.submit();
        } else {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }
      }, 300);
    }

    return { success: true, message: `Campo ${selector} preenchido com: "${value}" ${submit ? '(e submetido)' : ''}` };
  }

  function scrollPage({ direction, selector, amount = 600 }) {
    if (direction === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (direction === 'bottom') {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else if (direction === 'down') {
      window.scrollBy({ top: amount, behavior: 'smooth' });
    } else if (direction === 'up') {
      window.scrollBy({ top: -amount, behavior: 'smooth' });
    } else if (direction === 'element' && selector) {
      const el = document.querySelector(selector);
      if (!el) return { success: false, error: `Elemento para rolagem não encontrado: ${selector}` };
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightElement(el);
    }

    return { success: true, message: `Página rolada (${direction})` };
  }

  function runScript(code) {
    try {
      const fn = new Function(code);
      const result = fn();
      return { success: true, result: result !== undefined ? result : 'Executado sem retorno' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, payload } = message;

    switch (action) {
      case 'READ_PAGE':
        sendResponse(extractPageContent(payload?.max_length));
        break;
      case 'GET_PAGE_ELEMENTS':
        sendResponse(getInteractiveElements(payload?.selector));
        break;
      case 'CLICK_ELEMENT':
        sendResponse(clickElement(payload || {}));
        break;
      case 'FILL_FORM_FIELD':
        sendResponse(fillFormField(payload || {}));
        break;
      case 'SCROLL_PAGE':
        sendResponse(scrollPage(payload || {}));
        break;
      case 'EXECUTE_PAGE_SCRIPT':
        sendResponse(runScript(payload?.code));
        break;
      case 'PING':
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: `Ação desconhecida: ${action}` });
    }

    return true;
  });
})();
