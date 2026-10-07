// emailClientStorage.js — persistence layer for the "Cliente de E-mail" feature
// Ported from the standalone "Cliente E-mail Plus" extension (lib/storage.js),
// converted from ES module to a plain script that attaches window.EmailClientStorage.
'use strict';

const EC_ACCOUNTS_KEY = 'emailClientAccounts';
const EC_SETTINGS_KEY = 'emailClientSettings';
const EC_SEEN_KEY_PREFIX = 'emailClientSeen_';

const EmailClientStorage = {
  async getAccounts() {
    const data = await chrome.storage.local.get(EC_ACCOUNTS_KEY);
    return data[EC_ACCOUNTS_KEY] || [];
  },

  async saveAccounts(accounts) {
    await chrome.storage.local.set({ [EC_ACCOUNTS_KEY]: accounts });
  },

  async addAccount(account) {
    const accounts = await this.getAccounts();
    accounts.push(account);
    await this.saveAccounts(accounts);
    return account;
  },

  async updateAccount(id, patch) {
    const accounts = await this.getAccounts();
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Conta não encontrada: ' + id);
    accounts[idx] = { ...accounts[idx], ...patch };
    await this.saveAccounts(accounts);
    return accounts[idx];
  },

  async removeAccount(id) {
    const accounts = await this.getAccounts();
    await this.saveAccounts(accounts.filter((a) => a.id !== id));
    await chrome.storage.local.remove(EC_SEEN_KEY_PREFIX + id);
  },

  async getSetting(key, fallback) {
    const data = await chrome.storage.local.get(EC_SETTINGS_KEY);
    const settings = data[EC_SETTINGS_KEY] || {};
    return key in settings ? settings[key] : fallback;
  },

  async setSetting(key, value) {
    const data = await chrome.storage.local.get(EC_SETTINGS_KEY);
    const settings = data[EC_SETTINGS_KEY] || {};
    settings[key] = value;
    await chrome.storage.local.set({ [EC_SETTINGS_KEY]: settings });
  },

  // Guarda o conjunto de IDs de mensagens já vistas por conta, para detectar novidades.
  async getSeenIds(accountId) {
    const key = EC_SEEN_KEY_PREFIX + accountId;
    const data = await chrome.storage.local.get(key);
    return new Set(data[key] || []);
  },

  async saveSeenIds(accountId, idsSet) {
    const key = EC_SEEN_KEY_PREFIX + accountId;
    const arr = Array.from(idsSet).slice(-500); // limita crescimento
    await chrome.storage.local.set({ [key]: arr });
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // OAuth Client ID/Secret cadastrados pelo usuário para cada provedor ('gmail' | 'outlook').
  // Guardado separado da lista de contas, igual ao padrão de Client ID do Google Drive.
  async getOAuthSettings(provider) {
    return this.getSetting('oauth_' + provider, null);
  },

  async setOAuthSettings(provider, { clientId, clientSecret } = {}) {
    await this.setSetting('oauth_' + provider, { clientId: clientId || '', clientSecret: clientSecret || '' });
  }
};

window.EmailClientStorage = EmailClientStorage;
