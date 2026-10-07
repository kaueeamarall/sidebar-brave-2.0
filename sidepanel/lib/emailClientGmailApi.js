// emailClientGmailApi.js — Gmail REST API v1 client for the "Cliente de E-mail" screen.
// Ported from the standalone "Cliente E-mail Plus" extension's lib/gmailApi.js.
// Depends on window.EmailClientOAuth and window.EmailClientStorage (load those first).
'use strict';

const EC_GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

const EmailClientGmailApi = {
  providerConfig(clientId, clientSecret = '') {
    return {
      clientId,
      tokenUrl: 'https://oauth2.googleapis.com/token',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send email profile',
      clientSecret
    };
  },

  async _authHeader(account) {
    const providerConfig = this.providerConfig(account.clientId, account.clientSecret);
    const token = await window.EmailClientOAuth.ensureFreshToken(account, providerConfig, (tokens) =>
      window.EmailClientStorage.updateAccount(account.id, { tokens })
    );
    return { Authorization: 'Bearer ' + token };
  },

  _decodeBase64Url(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(b64);
    try {
      return decodeURIComponent(escape(decoded));
    } catch {
      return decoded;
    }
  },

  _extractBodyAndParts(payload) {
    let html = '';
    let text = '';
    const attachments = [];
    const walk = (part) => {
      if (!part) return;
      const mime = part.mimeType || '';
      const filename = part.filename;
      if (filename && part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename,
          mimeType: mime,
          size: part.body.size || 0
        });
      } else if (part.body?.data) {
        if (mime === 'text/html') html += this._decodeBase64Url(part.body.data);
        else if (mime === 'text/plain') text += this._decodeBase64Url(part.body.data);
      }
      (part.parts || []).forEach(walk);
    };
    walk(payload);
    return { html, text, attachments };
  },

  _headerValue(headers, name) {
    const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  },

  _toMessageSummary(gmailMsg) {
    const headers = gmailMsg.payload?.headers || [];
    return {
      id: gmailMsg.id,
      threadId: gmailMsg.threadId,
      from: this._headerValue(headers, 'From'),
      to: this._headerValue(headers, 'To'),
      subject: this._headerValue(headers, 'Subject'),
      date: this._headerValue(headers, 'Date'),
      snippet: gmailMsg.snippet,
      unread: (gmailMsg.labelIds || []).includes('UNREAD'),
      labelIds: gmailMsg.labelIds || []
    };
  },

  // Gmail folders: normal boxes use labelIds; "Archive"/"All mail" pseudo-folders use search queries.
  _FOLDER_LABEL: { INBOX: 'INBOX', SENT: 'SENT', DRAFT: 'DRAFT', TRASH: 'TRASH', SPAM: 'SPAM' },
  _FOLDER_QUERY: { ARCHIVE: '-in:inbox -in:spam -in:trash', ALL: '' },

  async syncFolder(account, folder = 'INBOX', pageToken) {
    const headers = await this._authHeader(account);
    const listUrl = new URL(EC_GMAIL_API_BASE + '/messages');
    if (this._FOLDER_LABEL[folder]) {
      listUrl.searchParams.set('labelIds', this._FOLDER_LABEL[folder]);
    } else if (folder in this._FOLDER_QUERY) {
      if (this._FOLDER_QUERY[folder]) listUrl.searchParams.set('q', this._FOLDER_QUERY[folder]);
    }
    listUrl.searchParams.set('maxResults', '25');
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken);

    const listResp = await fetch(listUrl, { headers });
    if (!listResp.ok) throw new Error('Erro ao listar mensagens Gmail: ' + (await listResp.text()));
    const listJson = await listResp.json();
    const ids = (listJson.messages || []).map((m) => m.id);

    const messages = await Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`${EC_GMAIL_API_BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, { headers });
        if (!r.ok) return null;
        const json = await r.json();
        return this._toMessageSummary(json);
      })
    );

    return { messages: messages.filter(Boolean), nextPageToken: listJson.nextPageToken || null };
  },

  async getMessage(account, id) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GMAIL_API_BASE}/messages/${id}?format=full`, { headers });
    if (!r.ok) throw new Error('Erro ao buscar mensagem: ' + (await r.text()));
    const json = await r.json();
    const { html, text, attachments } = this._extractBodyAndParts(json.payload);
    return { ...this._toMessageSummary(json), bodyHtml: html, bodyText: text, attachments };
  },

  async getAttachment(account, messageId, attachmentId) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GMAIL_API_BASE}/messages/${messageId}/attachments/${attachmentId}`, { headers });
    if (!r.ok) throw new Error('Erro ao baixar anexo: ' + (await r.text()));
    const json = await r.json();
    return json.data; // base64url
  },

  _decodeBase64UrlToBytes(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },

  async getRawMessage(account, id) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GMAIL_API_BASE}/messages/${id}?format=raw`, { headers });
    if (!r.ok) throw new Error('Erro ao baixar e-mail: ' + (await r.text()));
    const json = await r.json();
    return this._decodeBase64UrlToBytes(json.raw);
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
    const headers = await this._authHeader(account);
    const body = read ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] };
    const r = await fetch(`${EC_GMAIL_API_BASE}/messages/${id}/modify`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('Erro ao marcar mensagem: ' + (await r.text()));
    return r.json();
  },

  async trash(account, id) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GMAIL_API_BASE}/messages/${id}/trash`, { method: 'POST', headers });
    if (!r.ok) throw new Error('Erro ao excluir mensagem: ' + (await r.text()));
    return r.json();
  },

  _buildRawMime({ to, subject, body, inReplyTo, references, from, attachments = [] }) {
    const headerLines = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0'];
    if (inReplyTo) headerLines.push(`In-Reply-To: ${inReplyTo}`);
    if (references) headerLines.push(`References: ${references}`);

    let raw;
    if (!attachments.length) {
      raw = headerLines.concat(['Content-Type: text/html; charset=UTF-8', '', body]).join('\r\n');
    } else {
      const boundary = 'mixed_' + Math.random().toString(36).slice(2);
      const parts = [`--${boundary}`, 'Content-Type: text/html; charset=UTF-8', '', body, ''];
      for (const att of attachments) {
        parts.push(
          `--${boundary}`,
          `Content-Type: ${att.mimeType || 'application/octet-stream'}; name="${att.filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${att.filename}"`,
          '',
          att.base64.replace(/(.{76})/g, '$1\r\n'),
          ''
        );
      }
      parts.push(`--${boundary}--`);
      raw = headerLines.concat([`Content-Type: multipart/mixed; boundary="${boundary}"`, '', ...parts]).join('\r\n');
    }

    const b64 = btoa(unescape(encodeURIComponent(raw)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  async send(account, { to, subject, body, threadId, inReplyTo, references, attachments }) {
    const headers = await this._authHeader(account);
    const raw = this._buildRawMime({ to, subject, body, inReplyTo, references, from: account.email, attachments });
    const payload = { raw };
    if (threadId) payload.threadId = threadId;

    const r = await fetch(`${EC_GMAIL_API_BASE}/messages/send`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('Erro ao enviar e-mail: ' + (await r.text()));
    return r.json();
  }
};

window.EmailClientGmailApi = EmailClientGmailApi;
