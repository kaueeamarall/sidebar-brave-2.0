// emailClientOAuth.js — OAuth2 (Authorization Code + PKCE) via chrome.identity.launchWebAuthFlow.
// Works on Brave (does not depend on a Google account already signed in to the browser,
// unlike chrome.identity.getAuthToken). Ported from the standalone "Cliente E-mail Plus"
// extension (lib/oauth.js), converted from ES module to window.EmailClientOAuth.
'use strict';

function ecRandomString(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function ecSha256Base64Url(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return ecBase64UrlFromBuffer(digest);
}

function ecBase64UrlFromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const EmailClientOAuth = {
  getRedirectUrl() {
    return chrome.identity.getRedirectURL('emailclient-oauth2');
  },

  async launchAuthCodeFlow({ authUrl, clientId, scope, extraParams = {} }) {
    const redirectUri = this.getRedirectUrl();
    const state = ecRandomString(16);
    const verifier = ecRandomString(64);
    const challenge = await ecSha256Base64Url(verifier);

    const url = new URL(authUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);

    const resultUrl = await chrome.identity.launchWebAuthFlow({
      url: url.toString(),
      interactive: true
    });

    const parsed = new URL(resultUrl);
    const returnedState = parsed.searchParams.get('state');
    const code = parsed.searchParams.get('code');
    if (returnedState !== state) throw new Error('State OAuth inválido — possível ataque CSRF.');
    if (!code) throw new Error('Código de autorização não retornado.');

    return { code, redirectUri, verifier };
  },

  async exchangeCodeForTokens({ tokenUrl, clientId, clientSecret, code, redirectUri, verifier }) {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    });
    if (clientSecret) body.set('client_secret', clientSecret);

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!resp.ok) throw new Error('Falha ao trocar código por token: ' + (await resp.text()));
    return resp.json();
  },

  async refreshAccessToken({ tokenUrl, clientId, clientSecret, refreshToken }) {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
    if (clientSecret) body.set('client_secret', clientSecret);

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!resp.ok) throw new Error('Falha ao renovar token: ' + (await resp.text()));
    return resp.json();
  },

  async ensureFreshToken(account, providerConfig, onUpdate) {
    const now = Date.now();
    if (account.tokens?.access_token && account.tokens.expires_at > now + 60_000) {
      return account.tokens.access_token;
    }
    if (!account.tokens?.refresh_token) {
      throw new Error('Sessão expirada. Refaça login na conta ' + account.email);
    }
    const tokens = await this.refreshAccessToken({
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
    if (onUpdate) await onUpdate(updated);
    return updated.access_token;
  }
};

window.EmailClientOAuth = EmailClientOAuth;
