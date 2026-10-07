// ccCommandRunner.js — Context Commander: interpolação e execução de comandos.
// Portado de menu-comandos/background.js, adaptado para módulo ES importável
// pelo service worker principal (src/background.js) do Sidebar 1.0.

import { CC_DEFAULT_SETTINGS } from './ccDefaults.js';

export function ccInterpolateVariables(template, vars) {
  if (!template || typeof template !== 'string') return '';
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, String(val ?? ''));
  }
  return result;
}

async function getCcSettings() {
  const { ccSettings = CC_DEFAULT_SETTINGS } = await chrome.storage.local.get('ccSettings');
  return ccSettings;
}

export async function ccExecuteAction(command, info, tab) {
  const settings = await getCcSettings();

  const rawUrl = info.linkUrl || info.srcUrl || info.pageUrl || (tab ? tab.url : '') || '';
  let domain = '';
  try { if (rawUrl) domain = new URL(rawUrl).hostname; } catch (_) {}

  const now = new Date();
  const vars = {
    selection: info.selectionText || '',
    url: rawUrl,
    title: tab ? tab.title || '' : '',
    domain,
    link: info.linkUrl || '',
    image_url: info.srcUrl || '',
    date: now.toLocaleDateString('pt-BR'),
    time: now.toLocaleTimeString('pt-BR'),
    timestamp: now.getTime()
  };

  const actionType = command.type;
  let executionResult = { success: false, title: command.title, type: actionType };

  try {
    switch (actionType) {
      case 'cmd':
      case 'powershell':
      case 'script':
      case 'open': {
        const finalCmd = ccInterpolateVariables(command.command, vars);
        const cwd = command.cwd ? ccInterpolateVariables(command.cwd, vars) : undefined;

        try {
          const resp = await fetch(`${settings.bridgeUrl}/run`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(settings.bridgeToken ? { 'X-Bridge-Token': settings.bridgeToken } : {})
            },
            body: JSON.stringify({
              type: actionType,
              command: finalCmd,
              cwd,
              interactive: Boolean(command.interactive),
              timeout: command.timeout || 30
            })
          });

          if (!resp.ok) throw new Error(`Bridge retornou status HTTP ${resp.status}`);

          const bridgeData = await resp.json();
          executionResult = {
            ...executionResult,
            success: bridgeData.success,
            exitCode: bridgeData.exitCode,
            stdout: bridgeData.stdout || '',
            stderr: bridgeData.stderr || bridgeData.error || '',
            durationMs: bridgeData.durationMs,
            interactive: bridgeData.interactive
          };

          if (bridgeData.success) {
            const msg = bridgeData.interactive
              ? 'Console interativo aberto no Windows!'
              : (bridgeData.stdout ? bridgeData.stdout.slice(0, 150) : 'Comando executado com sucesso!');
            await ccNotifyUser(tab, `✅ ${command.title}`, msg, 'success');
          } else {
            const err = bridgeData.stderr || bridgeData.error || 'Erro na execução do comando';
            await ccNotifyUser(tab, `❌ Erro: ${command.title}`, err.slice(0, 200), 'error');
          }
        } catch (fetchErr) {
          executionResult.error = `Bridge inacessível em ${settings.bridgeUrl}. O script 'iniciar_bridge.bat' está rodando?`;
          await ccNotifyUser(
            tab,
            '⚠️ Bridge Local Desconectado',
            `Não foi possível conectar em ${settings.bridgeUrl}. Inicie o 'iniciar_bridge.bat' no Windows.`,
            'error'
          );
        }
        break;
      }

      case 'browser_js': {
        if (!tab || !tab.id) throw new Error('Nenhuma aba ativa para injetar script.');
        const scriptCode = ccInterpolateVariables(command.code, vars);

        const [injection] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (codeString) => {
            try {
              const fn = new Function(codeString);
              return { success: true, result: fn() };
            } catch (err) {
              return { success: false, error: err.message };
            }
          },
          args: [scriptCode]
        });

        if (injection && injection.result && injection.result.success === false) {
          throw new Error(injection.result.error || 'Falha ao executar o script na página.');
        }
        executionResult.success = true;
        await ccNotifyUser(tab, `⚡ ${command.title}`, 'Script executado na página com sucesso!', 'success');
        break;
      }

      case 'copy_template': {
        const textToCopy = ccInterpolateVariables(command.template || '{{selection}}', vars);
        if (tab && tab.id) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text) => {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text);
              }
              const ta = document.createElement('textarea');
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
            },
            args: [textToCopy]
          });
        }
        executionResult.success = true;
        executionResult.copiedText = textToCopy;
        await ccNotifyUser(tab, '📋 Copiado para a Área de Transferência', textToCopy.slice(0, 100), 'success');
        break;
      }

      case 'open_url': {
        const targetUrl = ccInterpolateVariables(command.url, vars);
        if (targetUrl) {
          await chrome.tabs.create({ url: targetUrl, active: true });
          executionResult.success = true;
          await ccNotifyUser(tab, '🌐 Página Aberta', targetUrl.slice(0, 80), 'info');
        }
        break;
      }

      case 'webhook': {
        const targetUrl = ccInterpolateVariables(command.url, vars);
        const method = (command.method || 'POST').toUpperCase();
        const payload = command.payload ? ccInterpolateVariables(command.payload, vars) : null;

        let headers = { 'Content-Type': 'application/json' };
        if (command.headers) {
          try { headers = { ...headers, ...JSON.parse(ccInterpolateVariables(command.headers, vars)) }; } catch (_) {}
        }

        const fetchOptions = { method, headers };
        if (method !== 'GET' && method !== 'HEAD' && payload) fetchOptions.body = payload;

        const resp = await fetch(targetUrl, fetchOptions);
        const text = await resp.text();

        executionResult.success = resp.ok;
        executionResult.status = resp.status;
        executionResult.response = text.slice(0, 500);

        if (resp.ok) {
          await ccNotifyUser(tab, `🚀 Webhook: ${command.title}`, `Status ${resp.status} OK`, 'success');
        } else {
          await ccNotifyUser(tab, `❌ Webhook Erro: ${command.title}`, `Status ${resp.status}: ${text.slice(0, 150)}`, 'error');
        }
        break;
      }

      default:
        throw new Error(`Tipo de comando desconhecido: ${actionType}`);
    }
  } catch (err) {
    executionResult.success = false;
    executionResult.error = err.message;
    await ccNotifyUser(tab, '❌ Erro', err.message, 'error');
  }

  await ccRecordHistory({
    commandId: command.id,
    commandTitle: command.title,
    commandType: command.type,
    timestamp: Date.now(),
    result: executionResult
  });

  return executionResult;
}

async function ccRecordHistory(entry) {
  try {
    const { ccHistory = [] } = await chrome.storage.local.get('ccHistory');
    const settings = await getCcSettings();
    const maxItems = settings.historyMaxItems || 50;
    ccHistory.unshift(entry);
    if (ccHistory.length > maxItems) ccHistory.length = maxItems;
    await chrome.storage.local.set({ ccHistory });
  } catch (e) {
    console.error('Erro ao gravar histórico do Context Commander:', e);
  }
}

export async function ccNotifyUser(tab, title, message, type = 'info') {
  try {
    const badgeColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1';
    await chrome.action.setBadgeText({ text: type === 'success' ? '✓' : type === 'error' ? '✕' : 'i' });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    setTimeout(async () => {
      try { await chrome.action.setBadgeText({ text: '' }); } catch (_) {}
    }, 2800);
  } catch (_) {}

  if (tab && tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('brave://')) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (toastTitle, toastMsg, toastType) => {
          const TOAST_ID = '__cc_toast_container';
          let container = document.getElementById(TOAST_ID);
          if (!container) {
            container = document.createElement('div');
            container.id = TOAST_ID;
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
            document.body.appendChild(container);
          }

          const toast = document.createElement('div');
          const bgColors = {
            success: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
            error: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
            info: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
          };
          const borderColors = { success: '#059669', error: '#dc2626', info: '#6366f1' };

          toast.style.cssText = `
            background: ${bgColors[toastType] || bgColors.info};
            border: 1px solid ${borderColors[toastType] || borderColors.info};
            color: #f8fafc; padding: 12px 18px; border-radius: 10px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
            max-width: 380px; pointer-events: auto; opacity: 0;
            transform: translateY(12px) scale(0.96);
            transition: all 0.25s cubic-bezier(0.16,1,0.3,1); font-size: 13px; line-height: 1.4;
          `;

          const titleEl = document.createElement('div');
          titleEl.style.cssText = 'font-weight:700;margin-bottom:4px;font-size:13.5px;';
          titleEl.textContent = toastTitle;

          const msgEl = document.createElement('div');
          msgEl.style.cssText = 'color:#cbd5e1;word-break:break-word;max-height:120px;overflow-y:auto;font-family:monospace;font-size:12px;';
          msgEl.textContent = toastMsg;

          toast.appendChild(titleEl);
          if (toastMsg) toast.appendChild(msgEl);
          container.appendChild(toast);

          requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
          });

          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px) scale(0.95)';
            setTimeout(() => toast.remove(), 300);
          }, 4500);
        },
        args: [title, message, type]
      });
    } catch (_) {
      // Falha esperada em abas de sistema ou restritas
    }
  }
}
