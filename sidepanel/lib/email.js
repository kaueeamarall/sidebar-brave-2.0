// email.js — Email server presets, account manager and webmail integration
// Provides official configurations for Gmail & Outlook, plus compose link builders.
'use strict';

const EMAIL_PRESETS = {
  gmail: {
    id: 'gmail',
    name: 'Gmail / Google Workspace',
    iconColor: '#ea4335',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: 'SSL',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: 'SSL',
    composeUrl: (to, subject, body) => {
      const params = new URLSearchParams();
      params.set('view', 'cm');
      params.set('fs', '1');
      if (to) params.set('to', to);
      if (subject) params.set('su', subject);
      if (body) params.set('body', body);
      return `https://mail.google.com/mail/?${params.toString()}`;
    },
    quickLinks: {
      inbox: 'https://mail.google.com/mail/u/0/#inbox',
      unread: 'https://mail.google.com/mail/u/0/#search/is%3Aunread',
      sent: 'https://mail.google.com/mail/u/0/#sent',
      compose: 'https://mail.google.com/mail/u/0/?view=cm&fs=1'
    },
    appPasswordDocUrl: 'https://myaccount.google.com/apppasswords'
  },
  outlook: {
    id: 'outlook',
    name: 'Outlook / Hotmail / Office 365',
    iconColor: '#0078d4',
    smtpHost: 'smtp-mail.outlook.com',
    smtpPort: 587,
    smtpSecure: 'STARTTLS',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapSecure: 'SSL',
    composeUrl: (to, subject, body) => {
      const params = new URLSearchParams();
      if (to) params.set('to', to);
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
    },
    quickLinks: {
      inbox: 'https://outlook.live.com/mail/0/inbox',
      unread: 'https://outlook.live.com/mail/0/',
      sent: 'https://outlook.live.com/mail/0/sentitems',
      compose: 'https://outlook.live.com/mail/0/deeplink/compose'
    },
    appPasswordDocUrl: 'https://account.live.com/proofs/AppPassword'
  },
  custom: {
    id: 'custom',
    name: 'Personalizado / Outro',
    iconColor: '#7c5cff',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: 'STARTTLS',
    imapHost: '',
    imapPort: 993,
    imapSecure: 'SSL',
    composeUrl: (to, subject, body) => {
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      const query = params.toString() ? `?${params.toString()}` : '';
      return `mailto:${encodeURIComponent(to || '')}${query}`;
    },
    quickLinks: null,
    appPasswordDocUrl: null
  }
};

const EmailManager = {
  PRESETS: EMAIL_PRESETS,
  STORAGE_KEYS: {
    ACCOUNTS: 'email_accounts',
    HISTORY: 'email_history',
    DEFAULT_ACCOUNT_ID: 'email_default_account_id'
  },

  async getAccounts() {
    const data = await chrome.storage.local.get([this.STORAGE_KEYS.ACCOUNTS, this.STORAGE_KEYS.DEFAULT_ACCOUNT_ID]);
    const accounts = data[this.STORAGE_KEYS.ACCOUNTS] || [];
    const defaultId = data[this.STORAGE_KEYS.DEFAULT_ACCOUNT_ID] || (accounts[0]?.id ?? null);
    return { accounts, defaultId };
  },

  async saveAccount(accountData) {
    const { accounts, defaultId } = await this.getAccounts();
    const isEdit = Boolean(accountData.id);
    const id = accountData.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newAccount = {
      id,
      label: (accountData.label || '').trim() || (accountData.provider === 'gmail' ? 'Gmail' : accountData.provider === 'outlook' ? 'Outlook' : 'E-mail'),
      email: (accountData.email || '').trim(),
      provider: accountData.provider || 'gmail',
      smtpHost: (accountData.smtpHost || '').trim(),
      smtpPort: Number(accountData.smtpPort) || 587,
      smtpSecure: accountData.smtpSecure || 'STARTTLS',
      imapHost: (accountData.imapHost || '').trim(),
      imapPort: Number(accountData.imapPort) || 993,
      imapSecure: accountData.imapSecure || 'SSL',
      password: (accountData.password || '').trim(),
      updatedAt: Date.now()
    };

    let updatedAccounts;
    if (isEdit) {
      updatedAccounts = accounts.map(a => a.id === id ? newAccount : a);
    } else {
      updatedAccounts = [newAccount, ...accounts];
    }

    const newDefaultId = accountData.isDefault || accounts.length === 0 ? id : (defaultId || id);

    await chrome.storage.local.set({
      [this.STORAGE_KEYS.ACCOUNTS]: updatedAccounts,
      [this.STORAGE_KEYS.DEFAULT_ACCOUNT_ID]: newDefaultId
    });

    return newAccount;
  },

  async deleteAccount(id) {
    const { accounts, defaultId } = await this.getAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    let nextDefault = defaultId;
    if (defaultId === id) {
      nextDefault = filtered[0]?.id || null;
    }
    await chrome.storage.local.set({
      [this.STORAGE_KEYS.ACCOUNTS]: filtered,
      [this.STORAGE_KEYS.DEFAULT_ACCOUNT_ID]: nextDefault
    });
  },

  async setDefaultAccount(id) {
    await chrome.storage.local.set({
      [this.STORAGE_KEYS.DEFAULT_ACCOUNT_ID]: id
    });
  },

  async getHistory() {
    const data = await chrome.storage.local.get(this.STORAGE_KEYS.HISTORY);
    return data[this.STORAGE_KEYS.HISTORY] || [];
  },

  async addHistory(item) {
    const history = await this.getHistory();
    const entry = {
      id: `mail_${Date.now()}`,
      to: (item.to || '').trim(),
      subject: (item.subject || '').trim(),
      bodySnippet: (item.body || '').trim().slice(0, 160),
      bodyFull: (item.body || '').trim(),
      provider: item.provider || 'gmail',
      sentVia: item.sentVia || 'webmail',
      createdAt: Date.now()
    };
    const updated = [entry, ...history.slice(0, 49)];
    await chrome.storage.local.set({ [this.STORAGE_KEYS.HISTORY]: updated });
    return entry;
  },

  async deleteHistoryItem(id) {
    const history = await this.getHistory();
    const updated = history.filter(h => h.id !== id);
    await chrome.storage.local.set({ [this.STORAGE_KEYS.HISTORY]: updated });
  },

  async clearHistory() {
    await chrome.storage.local.remove(this.STORAGE_KEYS.HISTORY);
  },

  buildComposeUrl(provider, { to, subject, body }) {
    const preset = EMAIL_PRESETS[provider] || EMAIL_PRESETS.gmail;
    return preset.composeUrl(to, subject, body);
  },

  buildMailtoUrl({ to, subject, body }) {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);
    const query = params.toString() ? `?${params.toString()}` : '';
    return `mailto:${encodeURIComponent(to || '')}${query}`;
  }
};

const TempMailService = {
  API_BASE: 'https://api.mail.tm',
  STORAGE_KEYS: {
    ACCOUNTS: 'temp_mail_accounts',
    ACTIVE_ACCOUNT_ID: 'temp_mail_active_account_id'
  },

  async getAccounts() {
    const data = await chrome.storage.local.get(this.STORAGE_KEYS.ACCOUNTS);
    return data[this.STORAGE_KEYS.ACCOUNTS] || [];
  },

  async setAccounts(accounts) {
    await chrome.storage.local.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts });
  },

  async getActiveAccountId() {
    const data = await chrome.storage.local.get(this.STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
    return data[this.STORAGE_KEYS.ACTIVE_ACCOUNT_ID] || null;
  },

  async setActiveAccountId(id) {
    await chrome.storage.local.set({ [this.STORAGE_KEYS.ACTIVE_ACCOUNT_ID]: id });
  },

  async saveAccount(account) {
    const accounts = await this.getAccounts();
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) accounts[idx] = account;
    else accounts.push(account);
    await this.setAccounts(accounts);
  },

  async getDomains() {
    const res = await fetch(`${this.API_BASE}/domains`);
    if (!res.ok) throw new Error('Não foi possível obter domínios de e-mail temporário.');
    const data = await res.json();
    const domains = data['hydra:member'] || [];
    if (!domains.length) throw new Error('Nenhum domínio disponível no momento.');
    return domains.map(d => d.domain);
  },

  async createNewAccount() {
    const domains = await this.getDomains();
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const username = `box_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const address = `${username}@${domain}`;
    const password = `pwd_${Math.random().toString(36).slice(2, 10)}${Date.now()}`;

    const regRes = await fetch(`${this.API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });

    if (!regRes.ok && regRes.status !== 201) {
      const errData = await regRes.json().catch(() => ({}));
      throw new Error(errData['hydra:description'] || 'Erro ao registrar nova caixa de entrada temporária.');
    }

    const regData = await regRes.json();
    const accountId = regData.id;

    // Obter token JWT
    const tokenRes = await fetch(`${this.API_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });

    if (!tokenRes.ok) {
      throw new Error('Falha ao autenticar na caixa temporária.');
    }

    const tokenData = await tokenRes.json();
    const account = {
      id: accountId,
      address,
      password,
      token: tokenData.token,
      createdAt: Date.now()
    };

    await this.saveAccount(account);
    await this.setActiveAccountId(account.id);
    return account;
  },

  async deleteAccount(id) {
    const accounts = await this.getAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    await this.setAccounts(filtered);

    const activeId = await this.getActiveAccountId();
    if (activeId === id) {
      await this.setActiveAccountId(filtered[0]?.id || null);
    }
  },

  async refreshAccountToken(account) {
    try {
      const checkRes = await fetch(`${this.API_BASE}/me`, {
        headers: { 'Authorization': `Bearer ${account.token}` }
      });
      if (checkRes.status === 401) {
        const tokenRes = await fetch(`${this.API_BASE}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: account.address, password: account.password })
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          account.token = tokenData.token;
          await this.saveAccount(account);
        }
      }
    } catch {
      // Offline ou erro de rede — mantém o token salvo
    }
    return account;
  },

  async getActiveAccount() {
    let accounts = await this.getAccounts();
    let activeId = await this.getActiveAccountId();
    let account = accounts.find(a => a.id === activeId) || accounts[0] || null;

    if (!account || !account.token) {
      account = await this.createNewAccount();
      return account;
    }

    account = await this.refreshAccountToken(account);
    return account;
  },

  async getMessages(accountId) {
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account?.token) return [];

    const res = await fetch(`${this.API_BASE}/messages?page=1`, {
      headers: { 'Authorization': `Bearer ${account.token}` }
    });

    if (!res.ok) {
      if (res.status === 401) {
        await this.refreshAccountToken(account);
      }
      return [];
    }

    const data = await res.json();
    return data['hydra:member'] || [];
  },

  async getMessage(accountId, id) {
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account?.token) throw new Error('Sessão expirada');

    const res = await fetch(`${this.API_BASE}/messages/${id}`, {
      headers: { 'Authorization': `Bearer ${account.token}` }
    });

    if (!res.ok) throw new Error('Não foi possível carregar o conteúdo do e-mail.');
    return await res.json();
  },

  async deleteMessage(accountId, id) {
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account?.token) return;

    await fetch(`${this.API_BASE}/messages/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${account.token}` }
    });
  },

  extractVerificationCode(text, subject = '') {
    const fullText = `${subject}\n${text || ''}`;
    
    // Padrões comuns de códigos: "código 123456", "code: 123456", "verification code 123456"
    const labeledMatch = fullText.match(/(?:c[oó]digo|code|verification|seguran[cç]a|pin|token|otp|confirma[cç][aã]o)[\s:=-]+([0-9]{4,8})\b/i);
    if (labeledMatch) return labeledMatch[1];

    // Padrão de código com traço tipo "123-456"
    const dashMatch = fullText.match(/\b([0-9]{3}-[0-9]{3})\b/);
    if (dashMatch) return dashMatch[1];

    // Se houver um número isolado de 4 a 6 dígitos em linha própria ou destacado
    const isolatedMatch = fullText.match(/(?:^|\s|>)([0-9]{4,6})(?:$|\s|<)/m);
    if (isolatedMatch) return isolatedMatch[1];

    return null;
  }
};

window.EmailManager = EmailManager;
window.TempMailService = TempMailService;

