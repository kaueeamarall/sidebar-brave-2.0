(() => {
  'use strict';

  const id = location.pathname.match(/\/detail\/[^/]+\/([a-z0-9]{32})/i)?.[1];
  if (!id || document.getElementById('barra-lateral-extension-tools')) return;

  const host = document.createElement('aside');
  host.id = 'barra-lateral-extension-tools';
  host.style.cssText = [
    'position:fixed', 'z-index:2147483647', 'right:20px', 'bottom:20px',
    'display:flex', 'gap:8px', 'padding:10px', 'border-radius:12px',
    'background:#17171f', 'box-shadow:0 8px 28px #0008', 'font:12px Arial,sans-serif'
  ].join(';');

  const createButton = (label, type) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText = 'border:0;border-radius:7px;padding:8px 10px;background:#7c5cff;color:#fff;cursor:pointer;font:inherit';
    button.addEventListener('click', () => {
      button.disabled = true;
      chrome.runtime.sendMessage({ type, id }).finally(() => { button.disabled = false; });
    });
    return button;
  };

  host.append(
    createButton('CRX', 'EXTENSION_DOWNLOAD_CRX'),
    createButton('ZIP', 'EXTENSION_DOWNLOAD_ZIP'),
    createButton('Código-fonte', 'EXTENSION_VIEW_SOURCE')
  );
  document.documentElement.appendChild(host);
})();
