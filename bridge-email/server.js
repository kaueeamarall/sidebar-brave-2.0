// Bridge local IMAP/SMTP <-> REST para a extensão "Cliente E-mail Plus".
// Necessário porque extensões de navegador não podem abrir sockets TCP brutos.
// Uso: node server.js  (porta padrão 2003, apenas localhost)
//
// Dependências: npm install express imapflow nodemailer mailparser cors

const express = require('express');
const cors = require('cors');
const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '25mb' }));

function makeImapClient(cfg) {
  return new ImapFlow({
    host: cfg.imapHost,
    port: cfg.imapPort || 993,
    secure: cfg.secure !== false,
    auth: { user: cfg.username, pass: cfg.password },
    logger: false
  });
}

app.post('/test-connection', async (req, res) => {
  const client = makeImapClient(req.body);
  try {
    await client.connect();
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/messages/list', async (req, res) => {
  const { folder = 'INBOX', page = 1, pageSize = 25 } = req.body;
  const client = makeImapClient(req.body);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder === 'INBOX' ? 'INBOX' : folder);
    try {
      const total = client.mailbox.exists;
      const end = total - (page - 1) * pageSize;
      const start = Math.max(1, end - pageSize + 1);
      const messages = [];
      if (end > 0) {
        for await (const msg of client.fetch(`${start}:${end}`, { envelope: true, flags: true, uid: true })) {
          messages.push({
            id: String(msg.uid),
            from: msg.envelope.from?.map((f) => f.address).join(', '),
            to: msg.envelope.to?.map((t) => t.address).join(', '),
            subject: msg.envelope.subject || '',
            date: msg.envelope.date,
            snippet: '',
            unread: !msg.flags.has('\\Seen')
          });
        }
      }
      res.json({ messages: messages.reverse(), hasMore: start > 1 });
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/messages/get', async (req, res) => {
  const { id, folder = 'INBOX' } = req.body;
  const client = makeImapClient(req.body);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(id, { uid: true, source: true, envelope: true, flags: true });
      const parsed = await simpleParser(msg.source);
      res.json({
        id: String(id),
        from: parsed.from?.text,
        to: parsed.to?.text,
        subject: parsed.subject,
        date: parsed.date,
        bodyHtml: parsed.html || '',
        bodyText: parsed.text || '',
        unread: !msg.flags.has('\\Seen'),
        attachments: (parsed.attachments || []).map((a, idx) => ({
          attachmentId: String(idx),
          filename: a.filename || `anexo-${idx}`,
          mimeType: a.contentType,
          size: a.size,
          base64: a.content.toString('base64')
        }))
      });
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retorna o .eml bruto (RFC 2822) da mensagem, para download local.
app.post('/messages/raw', async (req, res) => {
  const { id, folder = 'INBOX' } = req.body;
  const client = makeImapClient(req.body);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(id, { uid: true, source: true });
      res.json({ raw: msg.source.toString('base64') });
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/messages/mark-read', async (req, res) => {
  const { id, read = true, folder = 'INBOX' } = req.body;
  const client = makeImapClient(req.body);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (read) await client.messageFlagsAdd(id, ['\\Seen'], { uid: true });
      else await client.messageFlagsRemove(id, ['\\Seen'], { uid: true });
    } finally {
      lock.release();
    }
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/messages/trash', async (req, res) => {
  const { id, folder = 'INBOX' } = req.body;
  const client = makeImapClient(req.body);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageFlagsAdd(id, ['\\Deleted'], { uid: true });
      await client.messageMove(id, 'Trash', { uid: true }).catch(() => {});
    } finally {
      lock.release();
    }
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/send', async (req, res) => {
  const { smtpHost, smtpPort, username, password, secure, email, to, subject, html, inReplyTo, references, attachments } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 465,
      secure: secure !== false,
      auth: { user: username, pass: password }
    });
    const info = await transporter.sendMail({
      from: email,
      to,
      subject,
      html,
      inReplyTo,
      references,
      attachments: (attachments || []).map((a) => ({
        filename: a.filename,
        content: a.contentBase64,
        encoding: 'base64',
        contentType: a.contentType
      }))
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = 2003;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Bridge IMAP/SMTP rodando em http://127.0.0.1:${PORT}`);
});
