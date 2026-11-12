import { Message, EdgeMemoryStats } from '../types';

export const STORAGE_PREFIX = 'neurocloud.v1.';
export const STORAGE_KEYS = {
  messages: `${STORAGE_PREFIX}messages`,
  aesKey: `${STORAGE_PREFIX}aes_key`,
  savedBytes: `${STORAGE_PREFIX}saved_bytes`,
  telemetry: `${STORAGE_PREFIX}telemetry`,
};

const enc = new TextEncoder();
const dec = new TextDecoder();

let cachedCryptoKey: CryptoKey | null = null;
let currentCipherLabel = 'AES-256-GCM';

// Base64 helpers
function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function utf8ByteLength(str: string): number {
  return enc.encode(str).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Deterministic cyrb53 hash (fast non-cryptographic string fingerprinting)
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export async function initCryptoKey(): Promise<CryptoKey | null> {
  if (cachedCryptoKey) return cachedCryptoKey;

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    currentCipherLabel = 'Plaintext (WebCrypto API unavailable)';
    return null;
  }

  try {
    const storedJwk = localStorage.getItem(STORAGE_KEYS.aesKey);
    if (storedJwk) {
      cachedCryptoKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(storedJwk),
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
      currentCipherLabel = 'AES-256-GCM';
      return cachedCryptoKey;
    }

    // Generate new 256-bit AES-GCM key
    const newKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('jwk', newKey);
    localStorage.setItem(STORAGE_KEYS.aesKey, JSON.stringify(exported));
    cachedCryptoKey = newKey;
    currentCipherLabel = 'AES-256-GCM';
    return cachedCryptoKey;
  } catch (err) {
    console.warn('WebCrypto initialization fallback:', err);
    currentCipherLabel = 'Plaintext (Key generation fallback)';
    return null;
  }
}

export async function encryptMessages(messages: Message[]): Promise<string> {
  const jsonStr = JSON.stringify(messages);
  const key = await initCryptoKey();

  if (!key || !window.crypto || !window.crypto.subtle) {
    return `plain:${jsonStr}`;
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(jsonStr)
  );

  return `enc:${toBase64(iv)}.${toBase64(encryptedBuf)}`;
}

export async function decryptMessages(rawStored: string | null): Promise<Message[]> {
  if (!rawStored) return [];

  if (rawStored.startsWith('plain:')) {
    try {
      return JSON.parse(rawStored.slice(6));
    } catch {
      return [];
    }
  }

  if (rawStored.startsWith('enc:')) {
    const key = await initCryptoKey();
    if (!key || !window.crypto || !window.crypto.subtle) return [];

    try {
      const payload = rawStored.slice(4);
      const dotIdx = payload.indexOf('.');
      if (dotIdx === -1) return [];

      const ivB64 = payload.slice(0, dotIdx);
      const ctB64 = payload.slice(dotIdx + 1);

      const iv = fromBase64(ivB64);
      const ct = fromBase64(ctB64);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        ct as BufferSource
      );

      return JSON.parse(dec.decode(decrypted));
    } catch (err) {
      console.warn('Failed to decrypt local edge storage payload:', err);
      return [];
    }
  }

  return [];
}

export function getLocalEdgeStorageBytes(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    // Include all neurocloud keys except the cryptographic key itself
    if (k && k.startsWith(STORAGE_PREFIX) && k !== STORAGE_KEYS.aesKey) {
      const val = localStorage.getItem(k) || '';
      total += utf8ByteLength(k) + utf8ByteLength(val);
    }
  }
  return total;
}

export function getEdgeMemoryStats(messages: Message[]): EdgeMemoryStats {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.messages) || '' : '';
  const savedRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.savedBytes) || '0' : '0';
  const savedBytes = parseInt(savedRaw, 10) || 0;
  const localBytes = getLocalEdgeStorageBytes();
  const jwk = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.aesKey) || '{"kty":"oct","alg":"A256GCM"}' : '{}';

  return {
    localBytes,
    savedBytes,
    cipherLabel: currentCipherLabel,
    turnsCached: messages.length,
    rawPayloadPreview: raw,
    rawLength: utf8ByteLength(raw),
    jwkExport: jwk,
  };
}

export function clearEdgeMemory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.messages);
  localStorage.removeItem(STORAGE_KEYS.savedBytes);
  localStorage.removeItem(STORAGE_KEYS.telemetry);
}
