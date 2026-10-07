// emailClientGraphApi.js — Microsoft Graph API client (Outlook/Hotmail/Office365) for the
// "Cliente de E-mail" screen. Ported from the standalone "Cliente E-mail Plus" extension's
// lib/graphApi.js. Depends on window.EmailClientOAuth and window.EmailClientStorage.
'use strict';

const EC_GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0/me';

const EmailClientGraphApi = {
  // Azure requires the app to be registered as a "Single-page application" (SPA) platform to
  // allow token exchange via cross-origin fetch (extension) without a client secret.
  providerConfig(clientId, tenant = 'common') {
    return {
      clientId,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      scope: 'openid offline_access Mail.ReadWrite Mail.Send User.Read',
      clientSecret: ''
    };
  },

  async _authHeader(account) {
    const providerConfig = this.providerConfig(account.clientId, account.tenant);
    const token = await window.EmailClientOAuth.ensureFreshToken(account, providerConfig, (tokens) =>
      window.EmailClientStorage.updateAccount(account.id, { tokens })
    );
    return { Authorization: 'Bearer ' + token };
  },

  _toMessageSummary(m) {
    return {
      id: m.id,
      threadId: m.conversationId,
      from: m.from?.emailAddress?.address || m.from?.emailAddress?.name || '',
      to: (m.toRecipients || []).map((r) => r.emailAddress?.address).join(', '),
      subject: m.subject || '',
      date: m.receivedDateTime,
      snippet: m.bodyPreview,
      unread: m.isRead === false,
      labelIds: m.isRead ? [] : ['UNREAD']
    };
  },

  _FOLDER_MAP: {
    INBOX: 'inbox',
    SENT: 'sentitems',
    DRAFT: 'drafts',
    TRASH: 'deleteditems',
    SPAM: 'junkemail',
    ARCHIVE: 'archive'
    // ALL has no fixed folder: query /me/messages (all folders except Graph's own exclusions).
  },

  async syncFolder(account, folder = 'INBOX', pageUrl) {
    const headers = await this._authHeader(account);
    const select = '$select=id,conversationId,from,toRecipients,subject,receivedDateTime,bodyPreview,isRead';

    let url;
    if (pageUrl) {
      url = pageUrl;
    } else if (folder === 'ALL') {
      url = `${EC_GRAPH_API_BASE}/messages?$top=25&${select}`;
    } else {
      const wellKnown = this._FOLDER_MAP[folder] || 'inbox';
      url = `${EC_GRAPH_API_BASE}/mailFolders/${wellKnown}/messages?$top=25&${select}`;
    }

    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error('Erro ao listar mensagens Outlook: ' + (await r.text()));
    const json = await r.json();
    return {
      messages: (json.value || []).map((m) => this._toMessageSummary(m)),
      nextPageToken: json['@odata.nextLink'] || null
    };
  },

  async getMessage(account, id) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GRAPH_API_BASE}/messages/${id}?$select=id,conversationId,from,toRecipients,subject,receivedDateTime,body,isRead,hasAttachments`, { headers });
    if (!r.ok) throw new Error('Erro ao buscar mensagem: ' + (await r.text()));
    const m = await r.json();
    const summary = this._toMessageSummary(m);

    let attachments = [];
    if (m.hasAttachments) {
      const ar = await fetch(`${EC_GRAPH_API_BASE}/messages/${id}/attachments?$select=id,name,contentType,size`, { headers });
      if (ar.ok) {
        const aj = await ar.json();
        attachments = (aj.value || []).map((a) => ({
          attachmentId: a.id,
          filename: a.name,
          mimeType: a.contentType,
          size: a.size
        }));
      }
    }

    return {
      ...summary,
      bodyHtml: m.body?.contentType === 'html' ? m.body.content : '',
      bodyText: m.body?.contentType === 'text' ? m.body.content : '',
      attachments
    };
  },

  async getAttachment(account, messageId, attachmentId) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GRAPH_API_BASE}/messages/${messageId}/attachments/${attachmentId}`, { headers });
    if (!r.ok) throw new Error('Erro ao baixar anexo: ' + (await r.text()));
    const json = await r.json();
    return json.contentBytes; // standard base64 (not base64url)
  },

  // Microsoft Graph exposes the raw .eml directly via $value.
  async getRawMessage(account, id) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GRAPH_API_BASE}/messages/${id}/$value`, { headers });
    if (!r.ok) throw new Error('Erro ao baixar e-mail: ' + (await r.text()));
    return r.arrayBuffer();
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
    const r = await fetch(`${EC_GRAPH_API_BASE}/messages/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: read })
    });
    if (!r.ok) throw new Error('Erro ao marcar mensagem: ' + (await r.text()));
    return r.json();
  },

  async trash(account, id) {
    const headers = await this._authHeader(account);
    const r = await fetch(`${EC_GRAPH_API_BASE}/messages/${id}/move`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationId: 'deleteditems' })
    });
    if (!r.ok) throw new Error('Erro ao excluir mensagem: ' + (await r.text()));
    return r.json();
  },

  _attachmentsPayload(attachments = []) {
    return attachments.map((att) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.filename,
      contentType: att.mimeType || 'application/octet-stream',
      contentBytes: att.base64
    }));
  },

  async send(account, { to, subject, body, messageIdToReply, attachments }) {
    const headers = await this._authHeader(account);

    if (messageIdToReply) {
      // Attachments on a reply require creating a reply draft first, then sending it.
      const draftResp = await fetch(`${EC_GRAPH_API_BASE}/messages/${messageIdToReply}/createReply`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: body })
      });
      if (!draftResp.ok) throw new Error('Erro ao responder e-mail: ' + (await draftResp.text()));
      const draft = await draftResp.json();

      if (attachments?.length) {
        for (const att of this._attachmentsPayload(attachments)) {
          await fetch(`${EC_GRAPH_API_BASE}/messages/${draft.id}/attachments`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(att)
          });
        }
      }
      const sendResp = await fetch(`${EC_GRAPH_API_BASE}/messages/${draft.id}/send`, { method: 'POST', headers });
      if (!sendResp.ok) throw new Error('Erro ao enviar resposta: ' + (await sendResp.text()));
      return { ok: true };
    }

    const message = {
      subject,
      body: { contentType: 'HTML', content: body },
      toRecipients: to.split(',').map((addr) => ({ emailAddress: { address: addr.trim() } })),
      attachments: attachments?.length ? this._attachmentsPayload(attachments) : undefined
    };
    const r = await fetch(`${EC_GRAPH_API_BASE}/sendMail`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true })
    });
    if (!r.ok) throw new Error('Erro ao enviar e-mail: ' + (await r.text()));
    return { ok: true };
  }
};

window.EmailClientGraphApi = EmailClientGraphApi;
