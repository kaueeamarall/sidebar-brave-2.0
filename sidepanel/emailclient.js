// emailclient.js — "Cliente de E-mail" screen controller (Gmail / Outlook / IMAP genérico).
// Ported and adapted from the standalone "Cliente E-mail Plus" extension (panel/panel.js),
// wired into Barra Lateral Plus's existing screen-navigation model (see sidepanel.js,
// which calls initEmailClientScreen() when the user opens data-screen="emailclient").
'use strict';

const EC_FOLDER_LABELS = {
  INBOX: 'Caixa de entrada',
  SENT: 'Enviados',
  DRAFT: 'Rascunhos',
  SPAM: 'Spam',
  ARCHIVE: 'Arquivados',
  ALL: 'Todos os e-mails',
  TRASH: 'Lixeira'
};

const ecState = {
  initialized: false,
  accounts: [],
  activeAccountId: null,
  activeFolder: 'INBOX',
  messages: [],
  selectedMessage: null,
  replyContext: null,
  view: 'list', // 'list' | 'reading'
  composeAttachments: []
};

let ecFastSyncTimer = null;

function ec$(id) { return document.getElementById(id); }

function ecActiveAccount() {
  return ecState.accounts.find((a) => a.id === ecState.activeAccountId);
}

function ecApiFor(account) {
  if (account.type === 'gmail') return window.EmailClientGmailApi;
  if (account.type === 'outlook') return window.EmailClientGraphApi;
  return window.EmailClientImapBridge;
}

// ── Init (called by sidepanel.js on screen open) ────────────────────────────
async function initEmailClientScreen() {
  ecState.accounts = await window.EmailClientStorage.getAccounts();
  if (ecState.accounts.length && !ecState.activeAccountId) {
    ecState.activeAccountId = ecState.accounts[0].id;
  }
  ecRenderAccountBar();
  ecRenderAccountsModal();
  ec$('ec-redirect-uri').value = window.EmailClientOAuth.getRedirectUrl();

  if (!ecState.initialized) {
    ecBindEvents();
    ecState.initialized = true;
  }

  ecSetView('list');
  if (ecState.activeAccountId) await ecLoadFolder();
  else ecRenderEmptyAccounts();

  ecStartFastForegroundSync();
}

function ecStartFastForegroundSync() {
  const FAST_SYNC_MS = 20000;
  clearInterval(ecFastSyncTimer);
  ecFastSyncTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (typeof currentScreen !== 'undefined' && currentScreen !== 'emailclient') return;
    if (ecState.view === 'list' && ecState.activeFolder === 'INBOX' && ecState.activeAccountId) {
      ecLoadFolder();
    }
  }, FAST_SYNC_MS);
}

function ecSetView(view) {
  ecState.view = view;
  const isReading = view === 'reading';
  ec$('ec-list-screen').classList.toggle('hidden', isReading);
  ec$('ec-reading-screen').classList.toggle('hidden', !isReading);
}

// ── Events ───────────────────────────────────────────────────────────────
function ecBindEvents() {
  ec$('ec-btn-refresh').addEventListener('click', () => ecLoadFolder());
  ec$('ec-btn-compose').addEventListener('click', () => ecOpenCompose());
  ec$('ec-btn-accounts').addEventListener('click', () => {
    ecShowAccountsSubView('main');
    ec$('ec-accounts-overlay').classList.remove('hidden');
  });
  ec$('ec-btn-close-accounts').addEventListener('click', () => ec$('ec-accounts-overlay').classList.add('hidden'));
  ec$('ec-btn-close-compose').addEventListener('click', () => ecCloseCompose());
  ec$('ec-btn-discard').addEventListener('click', () => ecCloseCompose());
  ec$('ec-btn-send').addEventListener('click', () => ecSendCompose());
  ec$('ec-btn-reader-back').addEventListener('click', () => { ecState.selectedMessage = null; ecSetView('list'); });

  ec$('ec-btn-folders').addEventListener('click', () => {
    ec$('ec-folder-chips').classList.toggle('ec-folder-chips-open');
  });

  ec$('ec-folder-chips').querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      ec$('ec-folder-chips').querySelectorAll('.chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      ecState.activeFolder = btn.dataset.folder;
      ec$('ec-current-folder-label').textContent = EC_FOLDER_LABELS[ecState.activeFolder] || ecState.activeFolder;
      ec$('ec-folder-chips').classList.remove('ec-folder-chips-open');
      ecSetView('list');
      ecLoadFolder();
    });
  });

  ec$('ec-search-input').addEventListener('input', (e) => ecFilterMessageList(e.target.value.toLowerCase()));

  ec$('ec-btn-add-gmail').addEventListener('click', ecAddGmailAccount);
  ec$('ec-btn-add-outlook').addEventListener('click', ecAddOutlookAccount);
  ec$('ec-btn-add-imap').addEventListener('click', ecAddImapAccount);

  ec$('ec-btn-copy-redirect').addEventListener('click', async () => {
    await navigator.clipboard.writeText(window.EmailClientOAuth.getRedirectUrl());
    ecFlashButton(ec$('ec-btn-copy-redirect'));
  });

  ecBindOAuthSettingsEvents();
  ecBindComposeToolbarEvents();
}

function ecFlashButton(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = '✓';
  setTimeout(() => { btn.innerHTML = original; }, 1200);
}

function ecShowStatus(el, message, isError = false) {
  el.textContent = message;
  el.classList.remove('hidden');
  el.style.color = isError ? 'var(--error)' : 'var(--success)';
}

function ecHideStatus(el) { el.classList.add('hidden'); }

// ── Account bar ──────────────────────────────────────────────────────────
function ecRenderAccountBar() {
  const bar = ec$('ec-account-bar');
  bar.innerHTML = '';
  if (!ecState.accounts.length) {
    bar.innerHTML = '<span class="tool-hint">Nenhuma conta configurada. Toque no ícone ⚙ para adicionar.</span>';
    return;
  }
  for (const acc of ecState.accounts) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip ec-account-chip' + (acc.id === ecState.activeAccountId ? ' active' : '');
    chip.innerHTML = `<span class="ec-account-dot ec-account-dot-${acc.type}"></span><span>${ecEscapeHtml(acc.email)}</span>`;
    chip.addEventListener('click', () => {
      ecState.activeAccountId = acc.id;
      ecRenderAccountBar();
      ecLoadFolder();
    });
    bar.appendChild(chip);
  }
}

function ecRenderEmptyAccounts() {
  ec$('ec-message-list').innerHTML = '';
  ec$('ec-empty-state').classList.remove('hidden');
}

// ── Sync / message list ──────────────────────────────────────────────────
async function ecLoadFolder() {
  const account = ecActiveAccount();
  const listEl = ec$('ec-message-list');
  const statusEl = ec$('ec-list-status');
  ec$('ec-empty-state').classList.add('hidden');
  ecHideStatus(statusEl);

  if (!account) { ecRenderEmptyAccounts(); return; }

  listEl.innerHTML = '<li class="tool-hint" style="padding:10px">Carregando…</li>';
  try {
    const api = ecApiFor(account);
    const resp = await api.syncFolder(account, ecState.activeFolder);
    ecState.messages = resp.messages;
    ecRenderMessageList();
  } catch (err) {
    let hint = '';
    if (String(err.message).includes('SERVICE_DISABLED') || String(err.message).includes('has not been used in project')) {
      hint = ' A Gmail API precisa ser ativada no Google Cloud Console (procure "Gmail API" e clique em Ativar).';
    }
    listEl.innerHTML = '';
    ecShowStatus(statusEl, 'Erro: ' + err.message + hint, true);
  }
}

function ecRenderMessageList() {
  const list = ec$('ec-message-list');
  list.innerHTML = '';
  if (!ecState.messages.length) {
    list.innerHTML = '<li class="tool-hint" style="padding:10px">Nenhuma mensagem.</li>';
    return;
  }
  for (const msg of ecState.messages) {
    const item = document.createElement('li');
    item.className = 'inbox-message-item';
    item.dataset.id = msg.id;
    item.innerHTML = `
      <div class="inbox-message-row">
        ${msg.unread ? '<span class="unread-badge"></span>' : ''}
        <span class="inbox-message-from">${ecEscapeHtml(ecShortFrom(msg.from))}</span>
        <span class="inbox-message-date">${ecFormatDate(msg.date)}</span>
      </div>
      <div class="inbox-message-subject">${ecEscapeHtml(msg.subject || '(sem assunto)')}</div>
      <div class="inbox-message-snippet">${ecEscapeHtml(msg.snippet || '')}</div>
    `;
    item.addEventListener('click', () => ecSelectMessage(msg));
    list.appendChild(item);
  }
}

function ecFilterMessageList(query) {
  ec$('ec-message-list').querySelectorAll('.inbox-message-item').forEach((item) => {
    item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
}

function ecShortFrom(from) {
  if (!from) return '';
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  return match ? match[1].trim() : from;
}

function ecFormatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function ecFormatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function ecEscapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function ecEscapeAttr(str) { return String(str ?? '').replace(/"/g, '&quot;'); }

// ── Reading pane ─────────────────────────────────────────────────────────
async function ecSelectMessage(msg) {
  const account = ecActiveAccount();
  ecSetView('reading');
  const frame = ec$('ec-reader-body-frame');
  frame.srcdoc = '<html><body style="font-family:sans-serif;color:#888;padding:12px">Carregando mensagem…</body></html>';
  try {
    const api = ecApiFor(account);
    let full;
    if (account.type === 'imap') full = await api.getMessage(account, msg.id, ecState.activeFolder);
    else full = await api.getMessage(account, msg.id);

    ecState.selectedMessage = full;
    ecRenderReadingPane(full, account);

    if (full.unread) {
      ecMarkRead(account, full.id, true).catch(() => {});
      msg.unread = false;
      ecRenderMessageList();
    }
  } catch (err) {
    frame.srcdoc = `<html><body style="font-family:sans-serif;color:#ff5757;padding:12px">Erro ao abrir mensagem: ${ecEscapeHtml(err.message)}</body></html>`;
  }
}

function ecRenderReadingPane(msg, account) {
  ec$('ec-reader-subject').textContent = msg.subject || '(sem assunto)';
  ec$('ec-reader-from').textContent = msg.from || '';
  ec$('ec-reader-to').textContent = msg.to || '';
  ec$('ec-reader-date').textContent = ecFormatDate(msg.date);

  const hasAttachments = (msg.attachments || []).length > 0;
  ec$('ec-reader-attachments-box').classList.toggle('hidden', !hasAttachments);
  if (hasAttachments) ecRenderAttachmentsList(msg, account);

  const frame = ec$('ec-reader-body-frame');
  const html = msg.bodyHtml
    ? ecSanitizeHtmlForFrame(msg.bodyHtml)
    : `<html><body style="font-family:sans-serif;color:#111;background:#fff;margin:8px;white-space:pre-wrap">${ecEscapeHtml(msg.bodyText || msg.snippet || '(sem conteúdo)')}</body></html>`;
  frame.srcdoc = html;

  ec$('ec-btn-reply').onclick = () => ecOpenCompose({ mode: 'reply', msg, account });
  ec$('ec-btn-forward').onclick = () => ecOpenCompose({ mode: 'forward', msg, account });
  ec$('ec-btn-delete-msg').onclick = () => ecDeleteMessage(account, msg);
  ec$('ec-btn-download-eml').onclick = () => ecDownloadEml(account, msg);
}

function ecSanitizeHtmlForFrame(html) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  return `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;color:#111;background:#fff;margin:8px;}</style></head><body>${withoutScripts}</body></html>`;
}

function ecRenderAttachmentsList(msg, account) {
  const container = ec$('ec-reader-attachments-list');
  container.innerHTML = '';
  for (const att of msg.attachments) {
    const row = document.createElement('div');
    row.className = 'reading-attachment-row';
    row.innerHTML = `
      <span class="att-name">📎 ${ecEscapeHtml(att.filename)}</span>
      <span class="att-size">${ecFormatBytes(att.size)}</span>
      <button class="btn btn-ghost btn-xs">⬇ Baixar</button>
    `;
    row.querySelector('button').addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Baixando…';
      try {
        await ecDownloadAttachment(account, msg, att);
      } catch (err) {
        alert('Erro ao baixar anexo: ' + err.message);
      } finally {
        e.target.disabled = false;
        e.target.textContent = '⬇ Baixar';
      }
    });
    container.appendChild(row);
  }
}

async function ecMarkRead(account, id, read) {
  const api = ecApiFor(account);
  return api.markRead(account, id, read);
}

async function ecDeleteMessage(account, msg) {
  if (!confirm('Excluir esta mensagem?')) return;
  try {
    const api = ecApiFor(account);
    await api.trash(account, msg.id);
    await ecLoadFolder();
    ecState.selectedMessage = null;
    ecSetView('list');
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

// ── Downloads / anexos ───────────────────────────────────────────────────
function ecBase64ToBlob(base64, mimeType) {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

async function ecDownloadBlobViaChrome(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url, filename, saveAs: false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

async function ecDownloadAttachment(account, msg, att) {
  let blob;
  if (account.type === 'gmail') {
    const base64url = await window.EmailClientGmailApi.getAttachment(account, msg.id, att.attachmentId);
    blob = ecBase64ToBlob(base64url, att.mimeType);
  } else if (account.type === 'outlook') {
    const base64 = await window.EmailClientGraphApi.getAttachment(account, msg.id, att.attachmentId);
    blob = ecBase64ToBlob(base64, att.mimeType);
  } else {
    blob = ecBase64ToBlob(att.base64, att.mimeType);
  }
  await ecDownloadBlobViaChrome(blob, att.filename);
}

async function ecDownloadEml(account, msg) {
  try {
    let blob;
    if (account.type === 'gmail') {
      const bytes = await window.EmailClientGmailApi.getRawMessage(account, msg.id);
      blob = new Blob([bytes], { type: 'message/rfc822' });
    } else if (account.type === 'outlook') {
      const buffer = await window.EmailClientGraphApi.getRawMessage(account, msg.id);
      blob = new Blob([buffer], { type: 'message/rfc822' });
    } else {
      const base64 = await window.EmailClientImapBridge.getRawMessage(account, msg.id, ecState.activeFolder);
      blob = ecBase64ToBlob(base64, 'message/rfc822');
    }
    const safeName = (msg.subject || 'email').replace(/[^\w-]+/g, '_').slice(0, 60);
    await ecDownloadBlobViaChrome(blob, `${safeName}.eml`);
  } catch (err) {
    alert('Erro ao baixar e-mail: ' + err.message);
  }
}

// ── Compose ──────────────────────────────────────────────────────────────
function ecPopulateComposeFromSelect() {
  const select = ec$('ec-compose-from');
  select.innerHTML = ecState.accounts
    .map((acc) => `<option value="${acc.id}">${ecEscapeHtml(acc.email)} (${acc.type})</option>`)
    .join('');
  select.value = ecState.activeAccountId || (ecState.accounts[0]?.id ?? '');
}

function ecOpenCompose(ctx) {
  if (!ecState.accounts.length) { alert('Adicione uma conta de e-mail antes de compor.'); return; }
  ecState.replyContext = ctx || null;
  ecState.composeAttachments = [];
  ecRenderAttachmentChips();
  ecPopulateComposeFromSelect();
  if (ctx?.account) ec$('ec-compose-from').value = ctx.account.id;

  ec$('ec-compose-to').value = '';
  ec$('ec-compose-subject').value = '';
  ec$('ec-compose-text').innerHTML = '';
  ecHideStatus(ec$('ec-compose-status'));

  if (ctx?.mode === 'reply') {
    ec$('ec-compose-title').textContent = 'Responder';
    ec$('ec-compose-to').value = ecExtractEmail(ctx.msg.from);
    ec$('ec-compose-subject').value = ecPrefixSubject(ctx.msg.subject, 'Re:');
    ec$('ec-compose-text').innerHTML = ecQuoteBodyHtml(ctx.msg);
  } else if (ctx?.mode === 'forward') {
    ec$('ec-compose-title').textContent = 'Reencaminhar';
    ec$('ec-compose-subject').value = ecPrefixSubject(ctx.msg.subject, 'Fwd:');
    ec$('ec-compose-text').innerHTML = ecQuoteBodyHtml(ctx.msg);
  } else {
    ec$('ec-compose-title').textContent = 'Novo e-mail';
  }
  ec$('ec-compose-overlay').classList.remove('hidden');
}

function ecCloseCompose() {
  ec$('ec-compose-overlay').classList.add('hidden');
  ecState.replyContext = null;
  ecState.composeAttachments = [];
}

function ecExtractEmail(from) {
  const match = (from || '').match(/<([^>]+)>/);
  return match ? match[1] : from || '';
}

function ecPrefixSubject(subject, prefix) {
  subject = subject || '';
  return subject.toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;
}

function ecQuoteBodyHtml(msg) {
  const original = msg.bodyHtml || ecEscapeHtml(msg.bodyText || msg.snippet || '').replace(/\n/g, '<br>');
  return `<br><br>---- Mensagem original ----<br>De: ${ecEscapeHtml(msg.from)}<br>Data: ${ecEscapeHtml(ecFormatDate(msg.date))}<br><br>${original}`;
}

function ecBindComposeToolbarEvents() {
  ec$('ec-btn-insert-link').addEventListener('click', ecInsertLink);
  ec$('ec-btn-insert-image-url').addEventListener('click', ecInsertImageByUrl);
  ec$('ec-btn-insert-image-file').addEventListener('click', () => ec$('ec-file-input-image').click());
  ec$('ec-btn-insert-current-page').addEventListener('click', ecInsertCurrentPageLink);
  ec$('ec-btn-attach-file').addEventListener('click', () => ec$('ec-file-input-attachment').click());

  ec$('ec-file-input-image').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await ecFileToDataUrl(file);
    ec$('ec-compose-text').focus();
    document.execCommand('insertImage', false, dataUrl);
    e.target.value = '';
  });

  ec$('ec-file-input-attachment').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const base64 = await ecFileToBase64(file);
      ecState.composeAttachments.push({
        filename: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, base64
      });
    }
    ecRenderAttachmentChips();
    e.target.value = '';
  });
}

function ecInsertLink() {
  const url = prompt('URL do link:');
  if (!url) return;
  const text = prompt('Texto do link:', url) || url;
  ec$('ec-compose-text').focus();
  document.execCommand('insertHTML', false, `<a href="${ecEscapeAttr(url)}" target="_blank">${ecEscapeHtml(text)}</a>`);
}

function ecInsertImageByUrl() {
  const url = prompt('URL da imagem:');
  if (!url) return;
  ec$('ec-compose-text').focus();
  document.execCommand('insertHTML', false, `<img src="${ecEscapeAttr(url)}" alt="">`);
}

async function ecInsertCurrentPageLink() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return alert('Não foi possível obter a aba atual.');
    ec$('ec-compose-text').focus();
    document.execCommand('insertHTML', false, `<a href="${ecEscapeAttr(tab.url)}" target="_blank">${ecEscapeHtml(tab.title || tab.url)}</a>`);
  } catch (err) {
    alert('Erro ao ler a aba atual: ' + err.message);
  }
}

function ecRenderAttachmentChips() {
  const container = ec$('ec-attachment-list');
  container.innerHTML = '';
  ecState.composeAttachments.forEach((att, idx) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = `<span>📎 ${ecEscapeHtml(att.filename)} (${ecFormatBytes(att.size)})</span><button title="Remover">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      ecState.composeAttachments.splice(idx, 1);
      ecRenderAttachmentChips();
    });
    container.appendChild(chip);
  });
}

function ecFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ecFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function ecSendCompose() {
  const fromId = ec$('ec-compose-from').value;
  const account = ecState.accounts.find((a) => a.id === fromId) || ecActiveAccount();
  const statusEl = ec$('ec-compose-status');
  if (!account) return alert('Selecione uma conta de envio.');
  const to = ec$('ec-compose-to').value.trim();
  const subject = ec$('ec-compose-subject').value.trim();
  const bodyHtml = ec$('ec-compose-text').innerHTML;
  if (!to) return alert('Informe o destinatário.');

  ec$('ec-btn-send').disabled = true;
  ecHideStatus(statusEl);
  try {
    const ctx = ecState.replyContext;
    const attachments = ecState.composeAttachments;
    const api = ecApiFor(account);
    if (account.type === 'gmail') {
      await api.send(account, {
        to, subject, body: bodyHtml,
        threadId: ctx?.msg?.threadId,
        inReplyTo: ctx?.mode === 'reply' ? ctx.msg.id : undefined,
        attachments
      });
    } else if (account.type === 'outlook') {
      await api.send(account, {
        to, subject, body: bodyHtml,
        messageIdToReply: ctx?.mode === 'reply' ? ctx.msg.id : undefined,
        attachments
      });
    } else {
      await api.send(account, { to, subject, body: bodyHtml, attachments });
    }
    ecCloseCompose();
  } catch (err) {
    ecShowStatus(statusEl, 'Erro ao enviar: ' + err.message, true);
  } finally {
    ec$('ec-btn-send').disabled = false;
  }
}

// ── Accounts ─────────────────────────────────────────────────────────────
function ecRenderAccountsModal() {
  const list = ec$('ec-accounts-list');
  list.innerHTML = '';
  if (!ecState.accounts.length) {
    list.innerHTML = '<p class="tool-hint">Nenhuma conta cadastrada.</p>';
    return;
  }
  for (const acc of ecState.accounts) {
    const row = document.createElement('div');
    row.className = 'account-row';
    row.innerHTML = `
      <div><span class="ec-account-dot ec-account-dot-${acc.type}"></span> ${ecEscapeHtml(acc.email)} <span class="tool-hint">(${acc.type})</span></div>
      <button class="btn btn-ghost btn-xs" style="color:var(--error)">Remover</button>
    `;
    row.querySelector('button').addEventListener('click', async () => {
      await window.EmailClientStorage.removeAccount(acc.id);
      ecState.accounts = await window.EmailClientStorage.getAccounts();
      if (ecState.activeAccountId === acc.id) ecState.activeAccountId = ecState.accounts[0]?.id || null;
      ecRenderAccountBar();
      ecRenderAccountsModal();
      ecLoadFolder();
    });
    list.appendChild(row);
  }
}

// ── OAuth settings sub-panels (Gmail / Outlook) — persistent, no prompt() ──
function ecShowAccountsSubView(view) {
  // view: 'main' | 'gmail-settings' | 'outlook-settings'
  ec$('ec-accounts-main-panel').classList.toggle('hidden', view !== 'main');
  ec$('ec-gmail-settings-panel').classList.toggle('hidden', view !== 'gmail-settings');
  ec$('ec-outlook-settings-panel').classList.toggle('hidden', view !== 'outlook-settings');
}

async function ecOpenGmailSettings(message) {
  const redirect = window.EmailClientOAuth.getRedirectUrl();
  ec$('ec-gmail-redirect-uri').value = redirect;
  const saved = await window.EmailClientStorage.getOAuthSettings('gmail');
  ec$('ec-gmail-client-id-input').value = saved?.clientId || '';
  ec$('ec-gmail-client-secret-input').value = saved?.clientSecret || '';
  const statusEl = ec$('ec-gmail-settings-status');
  if (message) ecShowStatus(statusEl, message, true); else ecHideStatus(statusEl);
  ecShowAccountsSubView('gmail-settings');
}

async function ecOpenOutlookSettings(message) {
  const redirect = window.EmailClientOAuth.getRedirectUrl();
  ec$('ec-outlook-redirect-uri').value = redirect;
  const saved = await window.EmailClientStorage.getOAuthSettings('outlook');
  ec$('ec-outlook-client-id-input').value = saved?.clientId || '';
  ec$('ec-outlook-tenant-input').value = saved?.clientSecret || 'common'; // clientSecret field reused as tenant storage slot
  const statusEl = ec$('ec-outlook-settings-status');
  if (message) ecShowStatus(statusEl, message, true); else ecHideStatus(statusEl);
  ecShowAccountsSubView('outlook-settings');
}

function ecBindOAuthSettingsEvents() {
  ec$('ec-btn-goto-gmail-settings').addEventListener('click', () => ecOpenGmailSettings());
  ec$('ec-btn-goto-outlook-settings').addEventListener('click', () => ecOpenOutlookSettings());
  ec$('ec-btn-back-gmail-settings').addEventListener('click', () => ecShowAccountsSubView('main'));
  ec$('ec-btn-back-outlook-settings').addEventListener('click', () => ecShowAccountsSubView('main'));

  ec$('ec-btn-copy-gmail-redirect').addEventListener('click', async () => {
    await navigator.clipboard.writeText(ec$('ec-gmail-redirect-uri').value);
    ecFlashButton(ec$('ec-btn-copy-gmail-redirect'));
  });
  ec$('ec-btn-copy-outlook-redirect').addEventListener('click', async () => {
    await navigator.clipboard.writeText(ec$('ec-outlook-redirect-uri').value);
    ecFlashButton(ec$('ec-btn-copy-outlook-redirect'));
  });

  ec$('ec-btn-save-gmail-settings').addEventListener('click', async () => {
    const clientId = ec$('ec-gmail-client-id-input').value.trim();
    const clientSecret = ec$('ec-gmail-client-secret-input').value.trim();
    const statusEl = ec$('ec-gmail-settings-status');
    if (!clientId) return ecShowStatus(statusEl, 'Informe o Client ID.', true);
    if (!clientSecret) return ecShowStatus(statusEl, 'Informe o Client Secret (obrigatório para este tipo de client OAuth).', true);
    await window.EmailClientStorage.setOAuthSettings('gmail', { clientId, clientSecret });
    ecShowAccountsSubView('main');
    await ecAddGmailAccount();
  });

  ec$('ec-btn-save-outlook-settings').addEventListener('click', async () => {
    const clientId = ec$('ec-outlook-client-id-input').value.trim();
    const tenant = ec$('ec-outlook-tenant-input').value.trim() || 'common';
    const statusEl = ec$('ec-outlook-settings-status');
    if (!clientId) return ecShowStatus(statusEl, 'Informe o Application (client) ID.', true);
    await window.EmailClientStorage.setOAuthSettings('outlook', { clientId, clientSecret: tenant });
    ecShowAccountsSubView('main');
    await ecAddOutlookAccount();
  });
}

async function ecAddGmailAccount() {
  const statusEl = ec$('ec-accounts-status');
  const saved = await window.EmailClientStorage.getOAuthSettings('gmail');
  if (!saved?.clientId || !saved?.clientSecret) {
    return ecOpenGmailSettings('Configure seu Client ID e Client Secret antes de conectar.');
  }
  const clientId = saved.clientId;
  const clientSecret = saved.clientSecret;
  try {
    const providerConfig = window.EmailClientGmailApi.providerConfig(clientId, clientSecret);
    const { code, redirectUri, verifier } = await window.EmailClientOAuth.launchAuthCodeFlow({
      authUrl: providerConfig.authUrl, clientId, scope: providerConfig.scope
    });
    const tokens = await window.EmailClientOAuth.exchangeCodeForTokens({
      tokenUrl: providerConfig.tokenUrl, clientId, clientSecret, code, redirectUri, verifier
    });
    const profileResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token }
    });
    if (!profileResp.ok) throw new Error('Não foi possível obter o e-mail da conta Google.');
    const profile = await profileResp.json();

    const account = {
      id: window.EmailClientStorage.uid(),
      type: 'gmail',
      email: profile.email,
      clientId,
      clientSecret,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000
      }
    };
    await window.EmailClientStorage.addAccount(account);
    ecState.accounts = await window.EmailClientStorage.getAccounts();
    ecState.activeAccountId = account.id;
    ecRenderAccountBar();
    ecRenderAccountsModal();
    ecLoadFolder();
    ecShowStatus(statusEl, 'Conta Gmail conectada: ' + account.email);
  } catch (err) {
    ecShowStatus(statusEl, 'Falha ao conectar conta Gmail: ' + err.message, true);
  }
}

async function ecAddOutlookAccount() {
  const statusEl = ec$('ec-accounts-status');
  const saved = await window.EmailClientStorage.getOAuthSettings('outlook');
  if (!saved?.clientId) {
    return ecOpenOutlookSettings('Configure seu Client ID antes de conectar.');
  }
  const clientId = saved.clientId;
  const tenant = saved.clientSecret || 'common';
  try {
    const providerConfig = window.EmailClientGraphApi.providerConfig(clientId, tenant);
    const { code, redirectUri, verifier } = await window.EmailClientOAuth.launchAuthCodeFlow({
      authUrl: providerConfig.authUrl, clientId, scope: providerConfig.scope
    });
    const tokens = await window.EmailClientOAuth.exchangeCodeForTokens({
      tokenUrl: providerConfig.tokenUrl, clientId, clientSecret: '', code, redirectUri, verifier
    });
    const profileResp = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: 'Bearer ' + tokens.access_token }
    });
    if (!profileResp.ok) throw new Error('Não foi possível obter o e-mail da conta Microsoft.');
    const profile = await profileResp.json();

    const account = {
      id: window.EmailClientStorage.uid(),
      type: 'outlook',
      email: profile.mail || profile.userPrincipalName,
      clientId,
      tenant,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000
      }
    };
    await window.EmailClientStorage.addAccount(account);
    ecState.accounts = await window.EmailClientStorage.getAccounts();
    ecState.activeAccountId = account.id;
    ecRenderAccountBar();
    ecRenderAccountsModal();
    ecLoadFolder();
    ecShowStatus(statusEl, 'Conta Outlook conectada: ' + account.email);
  } catch (err) {
    if (String(err.message).includes('AADSTS90023') || String(err.message).includes('Cross-origin token redemption')) {
      ecShowStatus(statusEl, 'Plataforma do app registrado está errada: cadastre a URI de redirecionamento na plataforma "Single-page application (SPA)" no Azure Portal.', true);
    } else {
      ecShowStatus(statusEl, 'Falha ao conectar conta Outlook: ' + err.message, true);
    }
  }
}

async function ecAddImapAccount() {
  const statusEl = ec$('ec-accounts-status');
  const email = ec$('ec-imap-email').value.trim();
  const username = ec$('ec-imap-user').value.trim();
  const password = ec$('ec-imap-pass').value;
  const imapHost = ec$('ec-imap-host').value.trim();
  const imapPort = Number(ec$('ec-imap-port').value) || 993;
  const smtpHost = ec$('ec-smtp-host').value.trim();
  const smtpPort = Number(ec$('ec-smtp-port').value) || 465;
  const bridgeUrl = ec$('ec-bridge-url').value.trim() || window.EmailClientImapBridge.DEFAULT_BRIDGE_URL;

  if (!email || !password || !imapHost || !smtpHost) {
    return ecShowStatus(statusEl, 'Preencha e-mail, senha, servidor IMAP e servidor SMTP.', true);
  }

  const account = {
    id: window.EmailClientStorage.uid(),
    type: 'imap',
    email, username: username || email, password,
    imapHost, imapPort, smtpHost, smtpPort, bridgeUrl,
    secure: true
  };

  try {
    await window.EmailClientImapBridge.testConnection(account);
  } catch (err) {
    if (!confirm(`Não foi possível validar a conexão agora (${err.message}). Adicionar mesmo assim?`)) return;
  }

  await window.EmailClientStorage.addAccount(account);
  ecState.accounts = await window.EmailClientStorage.getAccounts();
  ecState.activeAccountId = account.id;
  ecRenderAccountBar();
  ecRenderAccountsModal();
  ecLoadFolder();
  ecShowStatus(statusEl, 'Conta IMAP/SMTP adicionada: ' + account.email);

  ['ec-imap-email', 'ec-imap-user', 'ec-imap-pass', 'ec-imap-host', 'ec-imap-port', 'ec-smtp-host', 'ec-smtp-port', 'ec-bridge-url']
    .forEach((id) => { ec$(id).value = ''; });
}

// Reacts to notification clicks routed from the background service worker.
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EMAIL_CLIENT_OPEN_FROM_NOTIFICATION') {
    if (typeof currentScreen !== 'undefined' && currentScreen === 'emailclient') ecLoadFolder();
  }
});
