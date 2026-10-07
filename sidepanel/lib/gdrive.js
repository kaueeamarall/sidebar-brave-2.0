// gdrive.js — Google Drive integration (OAuth via chrome.identity + Drive API v3)
// Ported from the standalone "Brave Drive Explorer" extension.
'use strict';

const GDRIVE_CONFIG = {
  SCOPES: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
  REVOKE_ENDPOINT: 'https://oauth2.googleapis.com/revoke',
  USERINFO_ENDPOINT: 'https://www.googleapis.com/oauth2/v3/userinfo',
  DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
  KEYS: {
    ACCESS_TOKEN: 'gdrive_access_token',
    TOKEN_EXPIRY: 'gdrive_token_expiry',
    USER_PROFILE: 'gdrive_user_profile',
    CLIENT_ID: 'gdrive_client_id'
  }
};

const GDriveAuth = {
  getRedirectUri() {
    return chrome.identity.getRedirectURL();
  },

  async getClientId() {
    const data = await chrome.storage.local.get(GDRIVE_CONFIG.KEYS.CLIENT_ID);
    return data[GDRIVE_CONFIG.KEYS.CLIENT_ID] || '';
  },

  async setClientId(clientId) {
    await chrome.storage.local.set({ [GDRIVE_CONFIG.KEYS.CLIENT_ID]: (clientId || '').trim() });
  },

  async getValidToken() {
    const data = await chrome.storage.local.get([GDRIVE_CONFIG.KEYS.ACCESS_TOKEN, GDRIVE_CONFIG.KEYS.TOKEN_EXPIRY]);
    const token = data[GDRIVE_CONFIG.KEYS.ACCESS_TOKEN];
    const expiry = data[GDRIVE_CONFIG.KEYS.TOKEN_EXPIRY];
    if (!token) return null;
    if (expiry && Date.now() > (expiry - 60000)) return null;
    return token;
  },

  async signIn() {
    const clientId = await this.getClientId();
    if (!clientId) throw new Error('CONFIG_REQUIRED: Client ID não configurado');

    const redirectUri = this.getRedirectUri();
    const authUrl = new URL(GDRIVE_CONFIG.AUTH_ENDPOINT);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', GDRIVE_CONFIG.SCOPES.join(' '));
    authUrl.searchParams.set('prompt', 'select_account');

    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (redirectUrl) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!redirectUrl) return reject(new Error('Login cancelado pelo usuário ou falha no redirecionamento.'));
        resolve(redirectUrl);
      });
    });

    const parsedUrl = new URL(responseUrl);
    const hash = parsedUrl.hash.substring(1);
    const params = new URLSearchParams(hash || parsedUrl.search);

    const token = params.get('access_token');
    const expiresIn = params.get('expires_in') || '3600';
    const error = params.get('error');
    if (error) throw new Error(`Erro retornado pelo Google: ${error}`);
    if (!token) throw new Error('Não foi possível obter o token de acesso da resposta do Google.');

    const expiryTime = Date.now() + parseInt(expiresIn, 10) * 1000;
    await chrome.storage.local.set({
      [GDRIVE_CONFIG.KEYS.ACCESS_TOKEN]: token,
      [GDRIVE_CONFIG.KEYS.TOKEN_EXPIRY]: expiryTime
    });

    const profile = await this.fetchUserProfile(token);
    await chrome.storage.local.set({ [GDRIVE_CONFIG.KEYS.USER_PROFILE]: profile });
    return { token, profile };
  },

  async fetchUserProfile(token) {
    const response = await fetch(GDRIVE_CONFIG.USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Falha ao obter perfil: status ${response.status}`);
    const data = await response.json();
    return { name: data.name || data.given_name || 'Usuário Google', email: data.email || '', picture: data.picture || '' };
  },

  async signOut() {
    const token = await this.getValidToken();
    if (token) {
      try {
        await fetch(`${GDRIVE_CONFIG.REVOKE_ENDPOINT}?token=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      } catch {}
    }
    await chrome.storage.local.remove([GDRIVE_CONFIG.KEYS.ACCESS_TOKEN, GDRIVE_CONFIG.KEYS.TOKEN_EXPIRY, GDRIVE_CONFIG.KEYS.USER_PROFILE]);
  }
};

const GDriveService = {
  async listFiles({ folderId = 'root', query = '', filterType = 'all' } = {}) {
    const token = await GDriveAuth.getValidToken();
    if (!token) throw new Error('AUTH_REQUIRED: Sessão expirada ou não autenticada');

    const queryParts = ['trashed = false'];
    if (query && query.trim().length > 0) {
      queryParts.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`);
    } else {
      queryParts.push(`'${folderId}' in parents`);
    }

    if (filterType === 'folder') queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
    else if (filterType === 'document') queryParts.push("(mimeType = 'application/vnd.google-apps.document' or mimeType contains 'word' or mimeType contains 'document')");
    else if (filterType === 'spreadsheet') queryParts.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType contains 'sheet' or mimeType contains 'excel')");
    else if (filterType === 'presentation') queryParts.push("(mimeType = 'application/vnd.google-apps.presentation' or mimeType contains 'presentation' or mimeType contains 'powerpoint')");
    else if (filterType === 'pdf') queryParts.push("mimeType = 'application/pdf'");
    else if (filterType === 'image') queryParts.push("mimeType contains 'image/'");

    const url = new URL(`${GDRIVE_CONFIG.DRIVE_API_BASE}/files`);
    url.searchParams.set('q', queryParts.join(' and '));
    url.searchParams.set('fields', 'files(id, name, mimeType, iconLink, thumbnailLink, webViewLink, webContentLink, size, modifiedTime)');
    url.searchParams.set('orderBy', 'folder,modifiedTime desc');
    url.searchParams.set('pageSize', '50');

    const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      if (response.status === 401) {
        await GDriveAuth.signOut();
        throw new Error('AUTH_EXPIRED: Token expirado ou inválido.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro ao consultar Drive (HTTP ${response.status})`);
    }
    const data = await response.json();
    return data.files || [];
  },

  async getStorageQuota() {
    const token = await GDriveAuth.getValidToken();
    if (!token) return null;
    try {
      const response = await fetch(`${GDRIVE_CONFIG.DRIVE_API_BASE}/about?fields=storageQuota`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return null;
      const data = await response.json();
      return data.storageQuota;
    } catch { return null; }
  },

  formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || Number(bytes) === 0) return '';
    const num = Number(bytes);
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(1024));
    return `${(num / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  },

  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  },

  getFileMeta(file) {
    const mime = file.mimeType || '';
    if (mime === 'application/vnd.google-apps.folder') return { type: 'folder', icon: 'folder' };
    if (mime.includes('document') || mime.includes('word')) return { type: 'document', icon: 'file-text' };
    if (mime.includes('spreadsheet') || mime.includes('sheet') || mime.includes('excel')) return { type: 'spreadsheet', icon: 'table' };
    if (mime.includes('presentation') || mime.includes('powerpoint')) return { type: 'presentation', icon: 'tv' };
    if (mime === 'application/pdf') return { type: 'pdf', icon: 'file' };
    if (mime.startsWith('image/')) return { type: 'image', icon: 'image' };
    return { type: 'file', icon: 'file' };
  }
};

window.GDriveAuth = GDriveAuth;
window.GDriveService = GDriveService;
