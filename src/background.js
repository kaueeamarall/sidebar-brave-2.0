// background.js — Service Worker (Manifest V3)
// Ephemeral: never store state in module-level variables; always use chrome.storage.

import { CC_DEFAULT_SETTINGS, CC_DEFAULT_COMMANDS } from './ccDefaults.js';
import { ccExecuteAction } from './ccCommandRunner.js';

// ── 1. Open Side Panel when the extension icon is clicked ──────────────────
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ── 2. Context Menu: single parent menu + submenus for each extension item ─
chrome.runtime.onInstalled.addListener(async () => {
  const { ccSettings, ccCommands, ccHistory } = await chrome.storage.local.get(['ccSettings', 'ccCommands', 'ccHistory']);
  if (!ccSettings) await chrome.storage.local.set({ ccSettings: CC_DEFAULT_SETTINGS });
  if (!ccCommands || !ccCommands.length) await chrome.storage.local.set({ ccCommands: CC_DEFAULT_COMMANDS });
  if (!ccHistory) await chrome.storage.local.set({ ccHistory: [] });

  rebuildContextMenus();
  chrome.alarms.create(EMAIL_CLIENT_POLL_ALARM, { periodInMinutes: EMAIL_CLIENT_POLL_MINUTES });
});
chrome.runtime.onStartup.addListener(() => {
  rebuildContextMenus();
  chrome.alarms.create(EMAIL_CLIENT_POLL_ALARM, { periodInMinutes: EMAIL_CLIENT_POLL_MINUTES });
});

// ── Cliente de E-mail: alarm-based mail checking + notifications ───────────
// Extensões de navegador não conseguem manter sockets/push nativo abertos com o service
// worker de MV3 potencialmente suspenso a qualquer momento, então usamos o alarme mínimo
// permitido pela chrome.alarms API (1 minuto) para verificar novas mensagens em segundo
// plano. Enquanto a tela "Cliente de E-mail" está aberta, emailclient.js faz polling mais
// rápido (ver ecStartFastForegroundSync em sidepanel/emailclient.js).
const EMAIL_CLIENT_POLL_ALARM = 'email-client-poll';
const EMAIL_CLIENT_POLL_MINUTES = 1;

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === EMAIL_CLIENT_POLL_ALARM) {
    await pollEmailClientAccounts();
  }
});

async function pollEmailClientAccounts() {
  const { emailClientAccounts = [] } = await chrome.storage.local.get('emailClientAccounts');
  for (const account of emailClientAccounts) {
    try {
      const newMessages = await emailClientCheckAccount(account);
      for (const msg of newMessages) emailClientNotify(account, msg);
    } catch (err) {
      console.warn('[ClienteDeEmail] Falha ao verificar conta', account.email, err);
    }
  }
}

async function emailClientUpdateAccountTokens(accountId, tokens) {
  const { emailClientAccounts = [] } = await chrome.storage.local.get('emailClientAccounts');
  const idx = emailClientAccounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return;
  emailClientAccounts[idx] = { ...emailClientAccounts[idx], tokens };
  await chrome.storage.local.set({ emailClientAccounts });
}

async function emailClientRefreshToken({ tokenUrl, clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({ client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken });
  if (clientSecret) body.set('client_secret', clientSecret);
  const resp = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!resp.ok) throw new Error('Falha ao renovar token: ' + (await resp.text()));
  return resp.json();
}

async function emailClientAuthHeader(account, providerConfig) {
  const now = Date.now();
  if (account.tokens?.access_token && account.tokens.expires_at > now + 60_000) {
    return { Authorization: 'Bearer ' + account.tokens.access_token };
  }
  if (!account.tokens?.refresh_token) throw new Error('Sessão expirada: ' + account.email);
  const tokens = await emailClientRefreshToken({
    tokenUrl: providerConfig.tokenUrl,
    clientId: providerConfig.clientId,
    clientSecret: providerConfig.clientSecret,
    refreshToken: account.tokens.refresh_token
  });
  const updated = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || account.tokens.refresh_token,
    expires_at: Date.now() + (tokens.expires_in || 3600) * 1000
  };
  account.tokens = updated;
  await emailClientUpdateAccountTokens(account.id, updated);
  return { Authorization: 'Bearer ' + updated.access_token };
}

async function emailClientGetSeenIds(accountId) {
  const key = 'emailClientSeen_' + accountId;
  const data = await chrome.storage.local.get(key);
  return new Set(data[key] || []);
}

async function emailClientSaveSeenIds(accountId, idsSet) {
  const key = 'emailClientSeen_' + accountId;
  await chrome.storage.local.set({ [key]: Array.from(idsSet).slice(-500) });
}

async function emailClientDiffNew(accountId, messages) {
  const seen = await emailClientGetSeenIds(accountId);
  const fresh = messages.filter((m) => !seen.has(m.id));
  const isFirstRun = seen.size === 0;
  messages.forEach((m) => seen.add(m.id));
  await emailClientSaveSeenIds(accountId, seen);
  return isFirstRun ? [] : fresh;
}

async function emailClientCheckAccount(account) {
  if (account.type === 'gmail') {
    const providerConfig = {
      clientId: account.clientId,
      clientSecret: account.clientSecret,
      tokenUrl: 'https://oauth2.googleapis.com/token'
    };
    const headers = await emailClientAuthHeader(account, providerConfig);
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=10';
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error('Erro ao consultar Gmail: ' + r.status);
    const json = await r.json();
    const ids = (json.messages || []).map((m) => m.id);
    const messages = await Promise.all(ids.map(async (id) => {
      const mr = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, { headers });
      if (!mr.ok) return null;
      const mj = await mr.json();
      const hdrs = mj.payload?.headers || [];
      const val = (name) => hdrs.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      return { id: mj.id, from: val('From'), subject: val('Subject') };
    }));
    return emailClientDiffNew(account.id, messages.filter(Boolean));
  }

  if (account.type === 'outlook') {
    const providerConfig = {
      clientId: account.clientId,
      clientSecret: '',
      tokenUrl: `https://login.microsoftonline.com/${account.tenant || 'common'}/oauth2/v2.0/token`
    };
    const headers = await emailClientAuthHeader(account, providerConfig);
    const url = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=10&$select=id,from,subject';
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error('Erro ao consultar Outlook: ' + r.status);
    const json = await r.json();
    const messages = (json.value || []).map((m) => ({
      id: m.id,
      from: m.from?.emailAddress?.address || m.from?.emailAddress?.name || '',
      subject: m.subject || ''
    }));
    return emailClientDiffNew(account.id, messages);
  }

  if (account.type === 'imap') {
    const bridgeUrl = account.bridgeUrl || 'http://127.0.0.1:2003';
    const body = {
      email: account.email,
      imapHost: account.imapHost, imapPort: account.imapPort,
      smtpHost: account.smtpHost, smtpPort: account.smtpPort,
      username: account.username || account.email, password: account.password,
      secure: account.secure !== false,
      folder: 'INBOX', page: 1, pageSize: 10
    };
    const r = await fetch(bridgeUrl + '/messages/list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) return []; // bridge local pode não estar rodando; silencioso no polling em segundo plano
    const json = await r.json();
    return emailClientDiffNew(account.id, json.messages || []);
  }

  return [];
}

function emailClientNotify(account, msg) {
  const id = `email-client-${account.id}-${msg.id}`;
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: msg.from || account.email,
    message: msg.subject || '(sem assunto)',
    contextMessage: account.email,
    priority: 1
  });
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('email-client-')) {
    chrome.notifications.clear(notificationId);
    chrome.runtime.sendMessage({ type: 'EMAIL_CLIENT_OPEN_FROM_NOTIFICATION' }).catch(() => {});
    chrome.storage.local.set({ pendingNavigation: { screen: 'emailclient', extraData: {}, timestamp: Date.now() } });
  }
});

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();

  // Root menu item: single option in browser context menu
  chrome.contextMenus.create({
    id: 'sidebar-root',
    title: 'Barra Lateral Plus',
    contexts: ['all']
  });

  // 1. Navegador Web
  chrome.contextMenus.create({
    id: 'menu-pages',
    parentId: 'sidebar-root',
    title: '🌐 Navegador Web',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'pages-pin',
    parentId: 'menu-pages',
    title: '📌 Fixar esta página / link',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'pages-view',
    parentId: 'menu-pages',
    title: '📖 Abrir na aba lateral',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'pages-open',
    parentId: 'menu-pages',
    title: '🌐 Abrir Navegador Web',
    contexts: ['all']
  });

  // 2. Notas
  chrome.contextMenus.create({
    id: 'menu-notes',
    parentId: 'sidebar-root',
    title: '📝 Notas',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'notes-save',
    parentId: 'menu-notes',
    title: '📝 Salvar seleção / página em Notas',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'notes-open',
    parentId: 'menu-notes',
    title: '📋 Abrir painel Notas',
    contexts: ['all']
  });

  // 3. Abas Salvas
  chrome.contextMenus.create({
    id: 'menu-savedtabs',
    parentId: 'sidebar-root',
    title: '📑 Abas Salvas',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'savedtabs-save-current',
    parentId: 'menu-savedtabs',
    title: '📌 Salvar aba atual',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'savedtabs-save-all',
    parentId: 'menu-savedtabs',
    title: '💾 Salvar todas as abas abertas',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'savedtabs-open',
    parentId: 'menu-savedtabs',
    title: '📑 Abrir Abas Salvas',
    contexts: ['all']
  });

  // 4. Exportar
  chrome.contextMenus.create({
    id: 'menu-export',
    parentId: 'sidebar-root',
    title: '📤 Exportar',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'export-pdf',
    parentId: 'menu-export',
    title: '📄 Imprimir / Salvar como PDF',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'export-markdown',
    parentId: 'menu-export',
    title: '📝 Exportar como Markdown',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'export-open',
    parentId: 'menu-export',
    title: '📤 Abrir painel Exportar',
    contexts: ['all']
  });

  // 5. Downloader
  chrome.contextMenus.create({
    id: 'menu-downloader',
    parentId: 'sidebar-root',
    title: '⬇️ Downloader',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'downloader-detect',
    parentId: 'menu-downloader',
    title: '⬇️ Downloader normal (mídia desta página / link)',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'savepage-current',
    parentId: 'menu-downloader',
    title: '📄 Baixar página web (HTML único)',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'social-open',
    parentId: 'menu-downloader',
    title: '📱 Baixar das redes sociais',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'downloader-open',
    parentId: 'menu-downloader',
    title: '🎬 Abrir Downloader',
    contexts: ['all']
  });

  // 7. Baixar Extensões
  chrome.contextMenus.create({
    id: 'menu-extension-downloader',
    parentId: 'sidebar-root',
    title: '🧩 Baixar Extensões',
    contexts: ['all'],
    documentUrlPatterns: ['https://chromewebstore.google.com/detail/*', 'https://chrome.google.com/webstore/detail/*']
  });
  chrome.contextMenus.create({
    id: 'extension-download-crx',
    parentId: 'menu-extension-downloader',
    title: '⬇️ Baixar .CRX',
    contexts: ['all'],
    documentUrlPatterns: ['https://chromewebstore.google.com/detail/*', 'https://chrome.google.com/webstore/detail/*']
  });
  chrome.contextMenus.create({
    id: 'extension-download-zip',
    parentId: 'menu-extension-downloader',
    title: '📦 Baixar .ZIP',
    contexts: ['all'],
    documentUrlPatterns: ['https://chromewebstore.google.com/detail/*', 'https://chrome.google.com/webstore/detail/*']
  });
  chrome.contextMenus.create({
    id: 'extension-view-source',
    parentId: 'menu-extension-downloader',
    title: '🔎 Ver código-fonte',
    contexts: ['all'],
    documentUrlPatterns: ['https://chromewebstore.google.com/detail/*', 'https://chrome.google.com/webstore/detail/*']
  });

  // 8. Encurtador de URL
  chrome.contextMenus.create({
    id: 'menu-shortener',
    parentId: 'sidebar-root',
    title: '🔗 Encurtador de URL',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'shortener-shorten',
    parentId: 'menu-shortener',
    title: '✂️ Encurtar esta URL',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'shortener-open',
    parentId: 'menu-shortener',
    title: '🔗 Abrir Encurtador',
    contexts: ['all']
  });

  // 8. Endereços
  chrome.contextMenus.create({
    id: 'menu-addresses',
    parentId: 'sidebar-root',
    title: '📍 Endereços',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'addresses-open',
    parentId: 'menu-addresses',
    title: '📍 Abrir Endereços',
    contexts: ['all']
  });

  // 9. Nuvem de Arquivos (GDrive / OneDrive)
  chrome.contextMenus.create({
    id: 'menu-gdrive',
    parentId: 'sidebar-root',
    title: '☁️ Nuvem de Arquivos',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'gdrive-open',
    parentId: 'menu-gdrive',
    title: '☁️ Abrir Google Drive',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'onedrive-open',
    parentId: 'menu-gdrive',
    title: '🟦 Abrir OneDrive',
    contexts: ['all']
  });

  // 10. E-mail Temporário
  chrome.contextMenus.create({
    id: 'menu-email',
    parentId: 'sidebar-root',
    title: '✉️ E-mail Temporário',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'email-open',
    parentId: 'menu-email',
    title: '⚡ Abrir E-mail Temporário',
    contexts: ['all']
  });

  // 11. Automação
  chrome.contextMenus.create({
    id: 'menu-automation',
    parentId: 'sidebar-root',
    title: '⚡ Automação',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'automation-record',
    parentId: 'menu-automation',
    title: '● Gravar automação nesta página',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'automation-open',
    parentId: 'menu-automation',
    title: '⚡ Abrir Automação',
    contexts: ['all']
  });

  // 12. Menu de Contexto
  chrome.contextMenus.create({
    id: 'menu-contextmenu',
    parentId: 'sidebar-root',
    title: '⚙️ Menu de Contexto',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'contextmenu-open',
    parentId: 'menu-contextmenu',
    title: '⚙️ Configurar Menu de Contexto',
    contexts: ['all']
  });

  // Regras customizadas do usuário (formato antigo, só "abrir URL")
  const rules = await getContextRules();
  for (const rule of rules) {
    chrome.contextMenus.create({
      id: `custom-${rule.id}`,
      parentId: 'menu-contextmenu',
      title: rule.title || rule.url,
      contexts: rule.contexts?.length ? rule.contexts : ['all']
    });
  }

  // Context Commander: comandos do Windows/PowerShell/scripts/JS/webhook
  await rebuildCcCommandMenus();
}

// ── Context Commander: comandos personalizados (cmd/powershell/script/browser_js/webhook) ──
async function rebuildCcCommandMenus() {
  const { ccCommands = [] } = await chrome.storage.local.get('ccCommands');
  const activeItems = ccCommands.filter(c => c.enabled !== false);
  if (!activeItems.length) return;

  const folders = activeItems.filter(c => c.isFolder);
  for (const folder of folders) {
    chrome.contextMenus.create({
      id: folder.id,
      parentId: folder.parentId && folders.some(f => f.id === folder.parentId) ? folder.parentId : 'menu-contextmenu',
      title: folder.title,
      contexts: folder.contexts?.length ? folder.contexts : ['all']
    });
  }

  const commandItems = activeItems.filter(c => !c.isFolder);
  for (const item of commandItems) {
    const parentExists = item.parentId && folders.some(f => f.id === item.parentId);
    chrome.contextMenus.create({
      id: item.id,
      parentId: parentExists ? item.parentId : 'menu-contextmenu',
      title: item.title,
      contexts: item.contexts?.length ? item.contexts : ['all']
    });
  }
}

async function openSidePanelWithScreen(tab, screen, extraData = {}) {
  // sidePanel.open() exige gesto do usuário: deve ser chamado antes de qualquer await.
  let opened = Promise.resolve();
  if (tab?.id) {
    opened = chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
      if (tab?.windowId) return chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
    });
  } else if (tab?.windowId) {
    opened = chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  }

  await chrome.storage.local.set({
    pendingNavigation: {
      screen,
      extraData,
      timestamp: Date.now()
    }
  });
  await opened;

  chrome.runtime.sendMessage({
    type: 'NAVIGATE_TO',
    screen,
    extraData
  }).catch(() => {});
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl ?? info.pageUrl ?? tab?.url ?? '';
  const pageTitle = tab?.title ?? targetUrl;

  switch (info.menuItemId) {
    case 'pin-page':
    case 'pages-pin': {
      const url = targetUrl;
      const title = info.selectionText || (info.linkUrl ? info.linkUrl : pageTitle);
      const favicon = tab?.favIconUrl ?? '';
      if (url) {
        await addPinnedPage({ url, title, favicon });
        chrome.runtime.sendMessage({ type: 'PAGES_UPDATED' }).catch(() => {});
      }
      await openSidePanelWithScreen(tab, 'pages');
      break;
    }

    case 'pages-view': {
      await openSidePanelWithScreen(tab, 'pages', { openUrl: targetUrl });
      break;
    }

    case 'social-open': {
      await openSidePanelWithScreen(tab, 'socialdownloader');
      break;
    }

    case 'pages-open': {
      await openSidePanelWithScreen(tab, 'pages');
      break;
    }

    case 'notes-save': {
      const content = info.selectionText
        ? info.selectionText
        : (targetUrl ? `Página: ${pageTitle}\n${targetUrl}` : '');
      const title = info.selectionText
        ? (tab?.title ? `Nota: ${tab.title}` : 'Nota rápida')
        : (pageTitle || 'Nova nota');
      await addNote({ title, content });
      chrome.runtime.sendMessage({ type: 'NOTES_UPDATED' }).catch(() => {});
      await openSidePanelWithScreen(tab, 'notes', { noteAdded: true });
      break;
    }

    case 'notes-open': {
      await openSidePanelWithScreen(tab, 'notes');
      break;
    }

    case 'savedtabs-save-current': {
      if (tab?.url && /^https?:/i.test(tab.url)) {
        await addSavedTabs([tab]);
        chrome.runtime.sendMessage({ type: 'SAVEDTABS_UPDATED' }).catch(() => {});
      }
      await openSidePanelWithScreen(tab, 'savedtabs');
      break;
    }

    case 'savedtabs-save-all': {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      await addSavedTabs(tabs || []);
      chrome.runtime.sendMessage({ type: 'SAVEDTABS_UPDATED' }).catch(() => {});
      await openSidePanelWithScreen(tab, 'savedtabs');
      break;
    }

    case 'savedtabs-open': {
      await openSidePanelWithScreen(tab, 'savedtabs');
      break;
    }

    case 'export-pdf': {
      if (tab?.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.print()
          });
        } catch {
          await openSidePanelWithScreen(tab, 'export');
        }
      } else {
        await openSidePanelWithScreen(tab, 'export');
      }
      break;
    }

    case 'export-markdown': {
      await openSidePanelWithScreen(tab, 'export', { format: 'md' });
      break;
    }

    case 'export-open': {
      await openSidePanelWithScreen(tab, 'export');
      break;
    }

    case 'downloader-detect': {
      const mediaUrl = info.srcUrl || targetUrl;
      await openSidePanelWithScreen(tab, 'downloader', { url: mediaUrl, autoDetect: true });
      break;
    }

    case 'downloader-open': {
      await openSidePanelWithScreen(tab, 'downloader');
      break;
    }

    case 'savepage-current': {
      if (tab?.id) {
        const result = await saveSingleFilePage(tab, {});
        if (!result.ok) await openSidePanelWithScreen(tab, 'savepage');
      } else {
        await openSidePanelWithScreen(tab, 'savepage');
      }
      break;
    }

    case 'extension-download-crx':
    case 'extension-download-zip':
    case 'extension-view-source': {
      const id = extractChromeExtensionId(info.pageUrl || tab?.url);
      if (id) {
        const action = info.menuItemId === 'extension-download-crx'
          ? 'EXTENSION_DOWNLOAD_CRX'
          : info.menuItemId === 'extension-download-zip'
            ? 'EXTENSION_DOWNLOAD_ZIP'
            : 'EXTENSION_VIEW_SOURCE';
        await handleExtensionDownloadAction(action, id);
      }
      break;
    }

    case 'shortener-shorten': {
      await openSidePanelWithScreen(tab, 'shortener', { url: targetUrl, autoShorten: true });
      break;
    }

    case 'shortener-open': {
      await openSidePanelWithScreen(tab, 'shortener');
      break;
    }

    case 'addresses-open': {
      await openSidePanelWithScreen(tab, 'addresses');
      break;
    }

    case 'gdrive-open': {
      await openSidePanelWithScreen(tab, 'gdrive', { provider: 'gdrive' });
      break;
    }

    case 'onedrive-open': {
      await openSidePanelWithScreen(tab, 'gdrive', { provider: 'onedrive' });
      break;
    }

    case 'email-open': {
      await openSidePanelWithScreen(tab, 'email');
      break;
    }

    case 'contextmenu-open': {
      await openSidePanelWithScreen(tab, 'contextmenu');
      break;
    }

    case 'automation-open': {
      await openSidePanelWithScreen(tab, 'automacao');
      break;
    }

    case 'automation-record': {
      await openSidePanelWithScreen(tab, 'automacao', { action: 'record' });
      break;
    }

    default: {
      if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('custom-')) {
        const ruleId = info.menuItemId.slice('custom-'.length);
        const rules = await getContextRules();
        const rule = rules.find(r => r.id === ruleId);
        if (rule) await runContextRuleAction(rule);
        break;
      }

      const { ccCommands = [] } = await chrome.storage.local.get('ccCommands');
      const command = ccCommands.find(c => c.id === info.menuItemId);
      if (command) await ccExecuteAction(command, info, tab);
      break;
    }
  }
});

async function runContextRuleAction(rule) {
  const action = rule.action || { type: 'open_url', url: rule.url };
  if (action.type === 'open_url' && action.url) {
    chrome.tabs.create({ url: action.url });
  }
}

async function saveSingleFilePage(tab, message = {}) {
  if (!tab?.id || !/^https?:/i.test(tab.url || '')) {
    return { ok: false, error: 'A aba atual não permite salvar esta página.' };
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['singlefile/single-file.js', 'singlefile/single-file-extension.js']
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async saveRawPage => {
        if (!globalThis.singlefile?.getPageData) {
          throw new Error('O mecanismo de captura SingleFile não foi carregado.');
        }
        const pageData = await globalThis.singlefile.getPageData({
          saveRawPage: Boolean(saveRawPage),
          removeHiddenElements: false,
          removeFrames: false,
          loadDeferredContent: true,
          loadDeferredImages: true,
          saveOriginalURLs: true,
          resolveLinks: true,
          compressHTML: false
        });
        return {
          content: pageData.content,
          filename: pageData.filename,
          mimeType: pageData.mimeType || 'text/html'
        };
      },
      args: [Boolean(message.saveRawPage)]
    });
    if (!result?.content) throw new Error('A página não retornou conteúdo capturável.');
    const safeName = String(result.filename || tab.title || 'pagina-web')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .trim() || 'pagina-web';
    const filename = safeName.toLowerCase().endsWith('.html') ? safeName : `${safeName}.html`;
    const dataUrl = `data:${result.mimeType};charset=utf-8,${encodeURIComponent(result.content)}`;
    await new Promise((resolve, reject) => {
      chrome.downloads.download({ url: dataUrl, filename, conflictAction: 'uniquify', saveAs: true }, downloadId => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (downloadId === undefined) reject(new Error('O navegador não iniciou o download.'));
        else resolve(downloadId);
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[Baixa Página Web] Falha ao salvar página:', error);
    return { ok: false, error: error?.message || 'Falha ao salvar a página.' };
  }
}

function extractChromeExtensionId(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!['chromewebstore.google.com', 'chrome.google.com'].includes(url.hostname)) return null;
    return url.pathname.match(/\/detail\/[^/]+\/([a-z0-9]{32})(?:[/?#]|$)/i)?.[1] || null;
  } catch {
    return null;
  }
}

function extensionCrxUrl(id) {
  return `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=99.0&acceptformat=crx2,crx3&x=id%3D${encodeURIComponent(id)}%26installsource%3Dondemand%26uc`;
}

function extensionSourceUrl(id) {
  return `https://app-database.com/apps/${encodeURIComponent(id)}/source-code`;
}

function crxToZipBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 16 || bytes[0] !== 0x43 || bytes[1] !== 0x72 || bytes[2] !== 0x32 || bytes[3] !== 0x34) {
    throw new Error('O arquivo recebido não é um CRX válido.');
  }
  const view = new DataView(buffer);
  const version = view.getUint32(4, true);
  let zipOffset;
  if (version === 2) {
    zipOffset = 16 + view.getUint32(8, true) + view.getUint32(12, true);
  } else if (version === 3) {
    zipOffset = 12 + view.getUint32(8, true);
  } else {
    throw new Error(`Formato CRX${version} não suportado.`);
  }
  if (zipOffset >= bytes.length || bytes[zipOffset] !== 0x50 || bytes[zipOffset + 1] !== 0x4b) {
    throw new Error('Cabeçalho CRX inválido ou ZIP ausente.');
  }
  return buffer.slice(zipOffset);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function downloadExtensionBuffer(buffer, filename, mimeType = 'application/octet-stream') {
  const dataUrl = `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`;
  const downloadFilename = ensureExtensionFilename(filename, mimeType);
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url: dataUrl, filename: downloadFilename, saveAs: true, conflictAction: 'uniquify' }, downloadId => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (downloadId === undefined) reject(new Error('O navegador não iniciou o download.'));
      else resolve(downloadId);
    });
  });
}

async function downloadExtensionUrl(url, filename) {
  const downloadFilename = ensureExtensionFilename(filename, 'application/x-chrome-extension');
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename: downloadFilename, saveAs: true, conflictAction: 'uniquify' }, downloadId => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (downloadId === undefined) reject(new Error('O navegador não iniciou o download.'));
      else resolve(downloadId);
    });
  });
}

function ensureExtensionFilename(filename, mimeType) {
  const cleanName = sanitizeDownloadFilename(filename);
  if (/\.(?:crx|zip)$/i.test(cleanName)) return cleanName;
  return `${cleanName}.${mimeType === 'application/zip' ? 'zip' : 'crx'}`;
}

async function handleExtensionDownloadAction(action, id) {
  if (!/^[a-z0-9]{32}$/i.test(id || '')) {
    return { ok: false, error: 'ID de extensão inválido.' };
  }
  try {
    if (action === 'EXTENSION_VIEW_SOURCE') {
      await chrome.tabs.create({ url: extensionSourceUrl(id) });
      return { ok: true };
    }
    const crxUrl = extensionCrxUrl(id);
    if (action === 'EXTENSION_DOWNLOAD_CRX') {
      await downloadExtensionUrl(crxUrl, `${id}.crx`);
      return { ok: true };
    }
    const response = await fetch(crxUrl, { redirect: 'follow' });
    if (!response.ok) throw new Error(`A Chrome Web Store respondeu HTTP ${response.status}.`);
    const crxBuffer = await response.arrayBuffer();
    await downloadExtensionBuffer(crxToZipBuffer(crxBuffer), `${id}.zip`, 'application/zip');
    return { ok: true };
  } catch (error) {
    console.error('[Baixar Extensões] Falha:', error);
    return { ok: false, error: error?.message || 'Não foi possível baixar a extensão.' };
  }
}

// ── 3. Message handling ─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_PAGES': {
        const pages = await getPinnedPages();
        sendResponse({ pages });
        break;
      }
      case 'ADD_PAGE': {
        await addPinnedPage(message.page);
        sendResponse({ ok: true });
        break;
      }
      case 'REMOVE_PAGE': {
        await removePinnedPage(message.id);
        sendResponse({ ok: true });
        break;
      }
      case 'REORDER_PAGES': {
        await chrome.storage.local.set({ pinnedPages: message.pages });
        sendResponse({ ok: true });
        break;
      }
      case 'UPDATE_PAGE': {
        await updatePinnedPage(message.id, message.updates);
        sendResponse({ ok: true });
        break;
      }
      case 'GET_PAGE_CATEGORIES': {
        const categories = await getPageCategories();
        sendResponse({ categories });
        break;
      }
      case 'SAVE_PAGE_CATEGORIES': {
        await chrome.storage.local.set({ pageCategories: message.categories || [] });
        sendResponse({ ok: true });
        break;
      }
      case 'PRINT_NOTE': {
        const tab = await chrome.tabs.create({ url: `data:text/html;charset=utf-8,${encodeURIComponent(message.html || '')}` });
        const listener = async (tabId, changeInfo) => {
          if (tabId !== tab.id || changeInfo.status !== 'complete') return;
          chrome.tabs.onUpdated.removeListener(listener);
          try {
            await chrome.scripting.executeScript({ target: { tabId }, func: () => window.print() });
          } catch (error) {
            console.warn('[Notas] Não foi possível abrir a impressão', error);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        sendResponse({ ok: true });
        break;
      }
      case 'download-media': {
        if (!message.url) {
          sendResponse({ ok: false, error: 'URL da mídia ausente.' });
          break;
        }
        chrome.downloads.download({
          url: message.url,
          filename: socialMediaFilename(message),
          saveAs: Boolean(message.saveAs),
          conflictAction: 'uniquify'
        }, downloadId => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true, downloadId });
          }
        });
        return;
      }
      case 'DOWNLOAD_URL': {
        if (!/^https?:/i.test(message.url || '')) {
          sendResponse({ ok: false, error: 'A URL do arquivo não é válida para download.' });
          break;
        }
        const filename = sanitizeDownloadFilename(message.filename || 'download');
        chrome.downloads.download({
          url: message.url,
          filename,
          saveAs: message.saveAs !== false,
          conflictAction: 'uniquify'
        }, downloadId => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true, downloadId });
          }
        });
        return;
      }
      case 'SINGLEFILE_SAVE_PAGE': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        sendResponse(await saveSingleFilePage(tab, message));
        break;
      }
      case 'EXTENSION_DOWNLOAD_CRX':
      case 'EXTENSION_DOWNLOAD_ZIP':
      case 'EXTENSION_VIEW_SOURCE': {
        sendResponse(await handleExtensionDownloadAction(message.type, message.id));
        break;
      }
      case 'GET_NOTES': {
        const notes = await getNotes();
        sendResponse({ notes });
        break;
      }
      case 'ADD_NOTE': {
        const note = await addNote(message.note);
        sendResponse({ ok: true, note });
        break;
      }
      case 'UPDATE_NOTE': {
        await updateNote(message.id, message.updates);
        sendResponse({ ok: true });
        break;
      }
      case 'REMOVE_NOTE': {
        await removeNote(message.id);
        sendResponse({ ok: true });
        break;
      }
      case 'GET_ACTIVE_TAB': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        sendResponse({ tab: tab ? { id: tab.id, url: tab.url, title: tab.title } : null });
        break;
      }
      case 'FETCH_HTML': {
        try {
          const res = await fetch(message.url, { credentials: 'omit' });
          const html = await res.text();
          sendResponse({ ok: true, html, finalUrl: res.url });
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
        break;
      }
      case 'CHECK_PAGE_ACCESS': {
        try {
          const response = await fetch(message.url, { method: 'GET', credentials: 'include', redirect: 'follow' });
          sendResponse({
            ok: true,
            finalUrl: response.url,
            frameBlocked: Boolean(response.headers.get('x-frame-options') || response.headers.get('content-security-policy')?.includes('frame-ancestors'))
          });
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
        break;
      }
      case 'GET_TAB_HTML': {
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            func: () => document.documentElement.outerHTML
          });
          sendResponse({ ok: true, html: result });
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
        break;
      }
      case 'PRINT_TAB': {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            func: () => window.print()
          });
          sendResponse({ ok: true });
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
        break;
      }
      case 'OPEN_TAB_FOR_EXPORT': {
        try {
          const tab = await chrome.tabs.create({ url: message.url, active: false });
          await waitForTabLoad(tab.id);
          sendResponse({ ok: true, tabId: tab.id });
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
        break;
      }
      case 'CLOSE_TAB': {
        try { await chrome.tabs.remove(message.tabId); } catch {}
        sendResponse({ ok: true });
        break;
      }
      case 'GET_ALL_TABS': {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        sendResponse({ tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title, favIconUrl: t.favIconUrl })) });
        break;
      }
      case 'GET_SAVED_TABS': {
        sendResponse({ savedTabs: await getSavedTabs() });
        break;
      }
      case 'ADD_SAVED_TABS': {
        await addSavedTabs(message.tabs);
        sendResponse({ ok: true });
        break;
      }
      case 'REMOVE_SAVED_TAB': {
        await removeSavedTab(message.id);
        sendResponse({ ok: true });
        break;
      }
      case 'GET_CONTEXT_RULES': {
        sendResponse({ rules: await getContextRules() });
        break;
      }
      case 'ADD_CONTEXT_RULE': {
        const rule = await addContextRule(message.rule);
        await rebuildContextMenus();
        sendResponse({ ok: true, rule });
        break;
      }
      case 'REMOVE_CONTEXT_RULE': {
        await removeContextRule(message.id);
        await rebuildContextMenus();
        sendResponse({ ok: true });
        break;
      }
      case 'CC_GET_COMMANDS': {
        const { ccCommands = [] } = await chrome.storage.local.get('ccCommands');
        sendResponse({ commands: ccCommands });
        break;
      }
      case 'CC_SAVE_COMMANDS': {
        await chrome.storage.local.set({ ccCommands: message.commands || [] });
        await rebuildContextMenus();
        sendResponse({ ok: true });
        break;
      }
      case 'CC_GET_SETTINGS': {
        const { ccSettings = CC_DEFAULT_SETTINGS } = await chrome.storage.local.get('ccSettings');
        sendResponse({ settings: ccSettings });
        break;
      }
      case 'CC_SAVE_SETTINGS': {
        const { ccSettings = CC_DEFAULT_SETTINGS } = await chrome.storage.local.get('ccSettings');
        const settings = { ...ccSettings, ...(message.settings || {}) };
        await chrome.storage.local.set({ ccSettings: settings });
        sendResponse({ ok: true, settings });
        break;
      }
      case 'CC_EXECUTE_COMMAND': {
        const { ccCommands = [] } = await chrome.storage.local.get('ccCommands');
        const command = ccCommands.find(c => c.id === message.commandId);
        if (!command) { sendResponse({ ok: false, error: 'Comando não encontrado' }); break; }
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const mockInfo = { selectionText: message.selection || '', pageUrl: activeTab ? activeTab.url : '', linkUrl: '' };
        const result = await ccExecuteAction(command, mockInfo, activeTab);
        sendResponse({ ok: true, result });
        break;
      }
      case 'CC_CHECK_BRIDGE': {
        const { ccSettings = CC_DEFAULT_SETTINGS } = await chrome.storage.local.get('ccSettings');
        try {
          const resp = await fetch(`${ccSettings.bridgeUrl}/health`, { method: 'GET' });
          if (resp.ok) sendResponse({ ok: true, bridge: await resp.json() });
          else sendResponse({ ok: false, status: resp.status });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }
      case 'CC_GET_HISTORY': {
        const { ccHistory = [] } = await chrome.storage.local.get('ccHistory');
        sendResponse({ history: ccHistory });
        break;
      }
      case 'AUTOFLOW_GENERATE_AI': {
        try {
          const steps = await autoflowGenerateAutomationWithAI(message.instruction, message.elements, message.settings);
          sendResponse({ ok: true, steps });
        } catch (err) {
          sendResponse({ ok: false, error: String(err.message || err) });
        }
        break;
      }
      case 'DETECT_MEDIA': {
        try {
          const media = await detectMediaUrl(message.url);
          sendResponse({ ok: true, ...media });
        } catch (err) {
          sendResponse({ ok: false, error: String(err) });
        }
        break;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async response
});

// ── Storage helpers ─────────────────────────────────────────────────────────
async function getPinnedPages() {
  const { pinnedPages = [] } = await chrome.storage.local.get('pinnedPages');
  return pinnedPages.map(page => ({
    ...page,
    categoryId: page.categoryId || null,
    currentUrl: page.currentUrl || page.url
  }));
}

async function addPinnedPage(page) {
  const pages = await getPinnedPages();
  const newPage = {
    id: Date.now().toString(),
    url: page.url,
    title: page.title || page.url,
    favicon: page.favicon || '',
    categoryId: page.categoryId || null,
    currentUrl: page.url,
    addedAt: Date.now()
  };
  pages.push(newPage);
  await chrome.storage.local.set({ pinnedPages: pages });
  return newPage;
}

async function getPageCategories() {
  const { pageCategories = [] } = await chrome.storage.local.get('pageCategories');
  return pageCategories;
}

async function removePinnedPage(id) {
  const pages = await getPinnedPages();
  await chrome.storage.local.set({ pinnedPages: pages.filter(p => p.id !== id) });
}

async function updatePinnedPage(id, updates) {
  const pages = await getPinnedPages();
  const idx = pages.findIndex(p => p.id === id);
  if (idx !== -1) {
    pages[idx] = { ...pages[idx], ...updates };
    await chrome.storage.local.set({ pinnedPages: pages });
  }

}

function socialMediaFilename(message) {
  const prefix = String(message.prefix || 'social-media')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .trim() || 'social-media';
  const mediaType = ['video', 'audio'].includes(message.mediaType) ? message.mediaType : 'image';
  let extension = mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : 'jpg';
  try {
    const match = new URL(message.url).pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mov', 'm4v', 'mp3', 'm4a', 'wav'];
    if (match && allowed.includes(match[1])) extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  } catch {}
  const index = Number.isInteger(message.index) ? message.index + 1 : 1;
  return `${prefix}-${mediaType}-${String(index).padStart(2, '0')}.${extension}`;
}

function sanitizeDownloadFilename(rawName) {
  const name = String(rawName || 'download')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/^\.+/, '')
    .trim();
  return name || 'download';
}

// ── Notes storage helpers ───────────────────────────────────────────────────
async function getNotes() {
  const { notes = [] } = await chrome.storage.local.get('notes');
  return notes;
}

async function addNote(note) {
  const notes = await getNotes();
  const newNote = {
    id: Date.now().toString(),
    title: note?.title || '',
    content: note?.content || '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  notes.unshift(newNote);
  await chrome.storage.local.set({ notes });
  return newNote;
}

async function updateNote(id, updates) {
  const notes = await getNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx !== -1) {
    notes[idx] = { ...notes[idx], ...updates, updatedAt: Date.now() };
    await chrome.storage.local.set({ notes });
  }
}

async function removeNote(id) {
  const notes = await getNotes();
  await chrome.storage.local.set({ notes: notes.filter(n => n.id !== id) });
}

// ── Saved tabs storage helpers ───────────────────────────────────────────
async function getSavedTabs() {
  const { savedTabs = [] } = await chrome.storage.local.get('savedTabs');
  return savedTabs;
}

async function addSavedTabs(tabsArr) {
  const savedTabs = await getSavedTabs();
  const now = Date.now();
  const newItems = (tabsArr || [])
    .filter(t => t?.url && /^https?:/i.test(t.url))
    .map((t, i) => ({
      id: `${now}-${i}`,
      url: t.url,
      title: t.title || t.url,
      favicon: t.favIconUrl || '',
      savedAt: now
    }));
  await chrome.storage.local.set({ savedTabs: [...newItems, ...savedTabs] });
  return newItems;
}

async function removeSavedTab(id) {
  const savedTabs = await getSavedTabs();
  await chrome.storage.local.set({ savedTabs: savedTabs.filter(t => t.id !== id) });
}

// ── Custom context-menu rules ────────────────────────────────────────────
async function getContextRules() {
  const { customContextMenus = [] } = await chrome.storage.local.get('customContextMenus');
  return customContextMenus;
}

async function addContextRule(rule) {
  const rules = await getContextRules();
  const newRule = {
    id: Date.now().toString(),
    title: rule?.title || 'Item',
    contexts: Array.isArray(rule?.contexts) && rule.contexts.length ? rule.contexts : ['page'],
    action: rule?.action || { type: 'open_url', url: rule?.url || '' }
  };
  rules.push(newRule);
  await chrome.storage.local.set({ customContextMenus: rules });
  return newRule;
}

async function removeContextRule(id) {
  const rules = await getContextRules();
  await chrome.storage.local.set({ customContextMenus: rules.filter(r => r.id !== id) });
}

async function detectMediaUrl(rawUrl) {
  let res = await fetch(rawUrl, { method: 'HEAD' }).catch(() => null);
  let contentType = res?.headers.get('content-type') || '';
  let contentLength = res?.headers.get('content-length') || '';

  if (!res || !contentType || contentType.includes('text/html')) {
    res = await fetch(rawUrl).catch(() => null);
    if (!res) return { mediaUrl: null, mediaType: null, isDirect: false };
    
    contentType = res.headers.get('content-type') || '';
    contentLength = res.headers.get('content-length') || '';
    if (contentType && !contentType.includes('text/html')) {
      const type = contentType.split('/')[0];
      return { 
        mediaUrl: res.url || rawUrl, 
        mediaType: type, 
        size: contentLength ? Number(contentLength) : null,
        isDirect: true 
      };
    }
    const html = await res.text();
    return extractMediaFromHtml(html, res.url || rawUrl);
  }

  const type = contentType.split('/')[0];
  return { 
    mediaUrl: rawUrl, 
    mediaType: type, 
    size: contentLength ? Number(contentLength) : null,
    isDirect: true 
  };
}

function extractMediaFromHtml(html, baseUrl) {
  const metaPriority = [
    ['og:video:secure_url', 'video'],
    ['og:video:url', 'video'],
    ['og:video', 'video'],
    ['twitter:player:stream', 'video']
  ];
  for (const [prop, type] of metaPriority) {
    const content = findMetaContent(html, [prop]);
    if (content) return resolveMedia(content, baseUrl, type);
  }

  const videoSrc = html.match(/<video[^>]*\ssrc=["']([^"']+)["']/i)?.[1]
    || html.match(/<video[\s\S]{0,500}?<source[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  if (videoSrc) return resolveMedia(videoSrc, baseUrl, 'video');

  const audioSrc = html.match(/<audio[^>]*\ssrc=["']([^"']+)["']/i)?.[1]
    || html.match(/<audio[\s\S]{0,500}?<source[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  if (audioSrc) return resolveMedia(audioSrc, baseUrl, 'audio');

  const ogImage = findMetaContent(html, ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image:src', 'twitter:image']);
  if (ogImage) return resolveMedia(ogImage, baseUrl, 'image');

  return { mediaUrl: null, mediaType: null, isDirect: false };
}

function findMetaContent(html, propNames) {
  const metaTags = html.match(/<meta[^>]*>/gi) || [];
  const lowerProps = propNames.map(p => p.toLowerCase());
  for (const tag of metaTags) {
    const propMatch = tag.match(/(?:property|name)=["']([^"']+)["']/i);
    const contentMatch = tag.match(/content=["']([^"']+)["']/i);
    if (propMatch && contentMatch && lowerProps.includes(propMatch[1].toLowerCase())) {
      return contentMatch[1];
    }
  }
  return null;
}

function resolveMedia(src, baseUrl, type) {
  try {
    return { mediaUrl: new URL(src, baseUrl).href, mediaType: type, isDirect: false };
  } catch {
    return { mediaUrl: null, mediaType: null, isDirect: false };
  }
}

// ── Automação: geração de passos via IA (Anthropic / OpenAI / Google) ──────
async function autoflowGenerateAutomationWithAI(instruction, elements, settings) {
  const { provider, apiKey, model } = settings || {};
  if (!apiKey) {
    throw new Error('Configure sua chave de API em Automação › Configurações.');
  }

  const elementsList = (elements || [])
    .map((e) => `[${e.idx}] <${e.tag}${e.type ? ' type=' + e.type : ''}> texto="${e.text}" placeholder="${e.placeholder}" aria-label="${e.ariaLabel}" name="${e.name}"`)
    .join('\n');

  const systemPrompt = `Você converte instruções em português (ou qualquer idioma) em uma sequência de ações de automação de navegador, em formato JSON estrito.
Cada ação deve referenciar o elemento pelo índice "idx" da lista fornecida (não invente índices que não existem).
Tipos de ação permitidos: "click" (idx), "input" (idx, value), "select" (idx, value), "check" (idx, checked), "keypress" (idx, key), "scroll" (y), "wait" (ms).
Responda APENAS com um JSON válido no formato: {"steps": [{"type": "...", "idx": 0, "value": "...", "delay": 300}, ...]}
Não inclua explicações, apenas o JSON.`;

  const userPrompt = `Elementos interativos disponíveis na página:\n${elementsList}\n\nInstrução do usuário: "${instruction}"\n\nGere a sequência de passos em JSON.`;

  let rawJson;
  if (provider === 'anthropic') {
    rawJson = await autoflowCallAnthropic(apiKey, model, systemPrompt, userPrompt);
  } else if (provider === 'openai') {
    rawJson = await autoflowCallOpenAI(apiKey, model, systemPrompt, userPrompt);
  } else if (provider === 'google') {
    rawJson = await autoflowCallGoogle(apiKey, model, systemPrompt, userPrompt);
  } else {
    throw new Error('Provedor de IA desconhecido.');
  }

  const parsed = autoflowExtractJson(rawJson);
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new Error('A IA não retornou um JSON de passos válido.');
  }

  const byIdx = new Map((elements || []).map((e) => [e.idx, e]));
  const steps = parsed.steps
    .map((s) => {
      const el = byIdx.get(s.idx);
      const base = { type: s.type, delay: s.delay || 300, label: el ? el.text || el.tag : '' };
      if (el) base.selector = el.selector;
      if (s.value !== undefined) base.value = s.value;
      if (s.checked !== undefined) base.checked = s.checked;
      if (s.key !== undefined) base.key = s.key;
      if (s.y !== undefined) base.y = s.y;
      if (s.ms !== undefined) base.ms = s.ms;
      return base;
    })
    .filter((s) => s.type === 'scroll' || s.type === 'wait' || s.selector);

  return steps;
}

async function autoflowCallOpenAI(apiKey, model, systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function autoflowCallAnthropic(apiKey, model, systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function autoflowCallGoogle(apiKey, model, systemPrompt, userPrompt) {
  const m = model || 'gemini-1.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    }
  );
  if (!res.ok) throw new Error(`Google: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function autoflowExtractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ── Tab helpers ──────────────────────────────────────────────────────────
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(); }, 15000);
  });
}
