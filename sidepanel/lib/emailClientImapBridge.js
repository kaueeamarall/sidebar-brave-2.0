// emailClientImapBridge.js — client for the local IMAP/SMTP bridge (bridge-email/server.js).
// Browser extensions (including Brave) cannot open raw TCP sockets, so "plain" IMAP/SMTP
// requires a small local bridge service that speaks IMAP/SMTP on one side and exposes a
// simple REST API on the other (http://127.0.0.1:2003 by default). See bridge-email/README.md.
// Ported from the standalone "Cliente E-mail Plus" extension's lib/imapBridge.js.
'use strict';

const EmailClientImapBridge = {
  DEFAULT_BRIDGE_URL: 'http://127.0.0.1:2003',

  _baseUrl(account) {
    return account.bridgeUrl || this.DEFAULT_BRIDGE_URL;
  },

  async _fetch(account, path, options = {}) {
    const url = this._baseUrl(account) + path;
    let resp;
    try {
      resp = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
    } catch (err) {
      throw new Error(`Não foi possível conectar à bridge IMAP/SMTP local em ${this._baseUrl(account)}. Verifique se o serviço (bridge-email/) está em execução.`);
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Bridge IMAP/SMTP retornou erro (${resp.status}): ${text || 'sem detalhes'}`);
    }
    return resp.json();
  },

  _credentialsPayload(account) {
    return {
      email: account.email,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      username: account.username || account.email,
      password: account.password,
      secure: account.secure !== false
    };
  },

  // Folder names assume the standard Gmail/IMAP convention. If the provider uses a different
  // name (e.g. "Junk" instead of "Spam"), set account.imapFolderNames when creating the account.
  DEFAULT_FOLDER_NAMES: {
    INBOX: 'INBOX',
    SENT: 'Sent',
    DRAFT: 'Drafts',
    TRASH: 'Trash',
    SPAM: 'Spam',
    ARCHIVE: 'Archive',
    ALL: 'INBOX'
  },

  _resolveFolder(account, folder) {
    const overrides = account.imapFolderNames || {};
    return overrides[folder] || this.DEFAULT_FOLDER_NAMES[folder] || folder;
  },

  async syncFolder(account, folder = 'INBOX', pageToken) {
    const body = {
      ...this._credentialsPayload(account),
      folder: this._resolveFolder(account, folder),
      page: pageToken ? Number(pageToken) : 1,
      pageSize: 25
    };
    const json = await this._fetch(account, '/messages/list', { method: 'POST', body: JSON.stringify(body) });
    return {
      messages: json.messages || [],
      nextPageToken: json.hasMore ? String((pageToken ? Number(pageToken) : 1) + 1) : null
    };
  },

  async getMessage(account, id, folder = 'INBOX') {
    const body = { ...this._credentialsPayload(account), id, folder: this._resolveFolder(account, folder) };
    return this._fetch(account, '/messages/get', { method: 'POST', body: JSON.stringify(body) });
  },

  async getRawMessage(account, id, folder = 'INBOX') {
    const body = { ...this._credentialsPayload(account), id, folder: this._resolveFolder(account, folder) };
    const json = await this._fetch(account, '/messages/raw', { method: 'POST', body: JSON.stringify(body) });
    return json.raw; // base64 string
  },

  async fetchNewCount(account) {
    const { messages } = await this.syncFolder(account, 'INBOX');
    const seen = await window.EmailClientStorage.getSeenIds(account.id);
    const fresh = messages.filter((m) => !seen.has(m.id));
    messages.forEach((m) => seen.add(m.id));
    await window.EmailClientStorage.saveSeenIds(account.id, seen);
    const isFirstRun = seen.size === messages.length && fresh.length === messages.length;
    return { newMessages: isFirstRun ? [] : fresh };
  },

  async markRead(account, id, read = true) {
    const body = { ...this._credentialsPayload(account), id, read };
    return this._fetch(account, '/messages/mark-read', { method: 'POST', body: JSON.stringify(body) });
  },

  async trash(account, id) {
    const body = { ...this._credentialsPayload(account), id };
    return this._fetch(account, '/messages/trash', { method: 'POST', body: JSON.stringify(body) });
  },

  async send(account, { to, subject, body, inReplyTo, references, attachments }) {
    const payload = {
      ...this._credentialsPayload(account),
      to,
      subject,
      html: body,
      inReplyTo,
      references,
      attachments: (attachments || []).map((a) => ({
        filename: a.filename,
        contentType: a.mimeType,
        contentBase64: a.base64
      }))
    };
    return this._fetch(account, '/send', { method: 'POST', body: JSON.stringify(payload) });
  },

  async testConnection(account) {
    return this._fetch(account, '/test-connection', { method: 'POST', body: JSON.stringify(this._credentialsPayload(account)) });
  }
};

window.EmailClientImapBridge = EmailClientImapBridge;
