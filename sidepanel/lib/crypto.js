// crypto.js — WebCrypto helpers for the local password vault (AES-GCM + PBKDF2)
'use strict';

function bufToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(len) {
  return crypto.getRandomValues(new Uint8Array(len));
}

async function deriveKey(masterPassword, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(masterPassword), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(key, plaintext) {
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { ivB64: bufToBase64(iv), cipherB64: bufToBase64(cipherBuf) };
}

async function decryptText(key, ivB64, cipherB64) {
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const cipherBuf = base64ToBuf(cipherB64);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  return new TextDecoder().decode(plainBuf);
}

window.VaultCrypto = { bufToBase64, base64ToBuf, randomBytes, deriveKey, encryptText, decryptText };
