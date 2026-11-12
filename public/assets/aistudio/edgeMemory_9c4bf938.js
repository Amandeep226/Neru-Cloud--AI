/* Edge-first memory: chat history lives only in this browser (AES-GCM encrypted localStorage). */
(function () {
  const NS = 'neurocloud.v1.';
  const K = { msgs: NS + 'messages', key: NS + 'aes_key', saved: NS + 'saved_bytes' };
  const enc = new TextEncoder(), dec = new TextDecoder();
  let messages = [], cryptoKey = null, cipherLabel = 'AES-256-GCM';
  let savedBytes = 0;

  const toB64 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  const fromB64 = (b) => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const utf8 = (s) => enc.encode(s).length;
  const fmt = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(2) + ' KB' : (n / 1048576).toFixed(2) + ' MB';

  async function loadKey() {
    if (!(window.crypto && crypto.subtle)) { cipherLabel = 'Plaintext (WebCrypto unavailable)'; return null; }
    try {
      const stored = localStorage.getItem(K.key);
      if (stored) return await crypto.subtle.importKey('jwk', JSON.parse(stored), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      localStorage.setItem(K.key, JSON.stringify(await crypto.subtle.exportKey('jwk', k)));
      return k;
    } catch (e) { cipherLabel = 'Plaintext (key unavailable)'; return null; }
  }

  async function persist() {
    const json = JSON.stringify(messages);
    let value = 'plain:' + json;
    if (cryptoKey) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc.encode(json));
      value = 'enc:' + toB64(iv) + '.' + toB64(ct);
    }
    try { localStorage.setItem(K.msgs, value); localStorage.setItem(K.saved, String(savedBytes)); }
    catch (e) { console.warn('Local edge storage is full or blocked:', e); }
  }

  async function init() {
    cryptoKey = await loadKey();
    savedBytes = parseInt(localStorage.getItem(K.saved) || '0', 10) || 0;
    const raw = localStorage.getItem(K.msgs);
    messages = [];
    if (raw) {
      try {
        if (raw.startsWith('enc:') && cryptoKey) {
          const [iv, ct] = raw.slice(4).split('.');
          const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, cryptoKey, fromB64(ct));
          messages = JSON.parse(dec.decode(pt));
        } else if (raw.startsWith('plain:')) messages = JSON.parse(raw.slice(6));
      } catch (e) { console.warn('Could not read local edge memory, starting fresh:', e); messages = []; }
    }
    render();
    return messages.slice();
  }

  async function add(role, content, meta) {
    const rec = Object.assign({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), role, content, ts: new Date().toISOString() }, meta || {});
    messages.push(rec);
    savedBytes += utf8(JSON.stringify(rec));
    await persist();
    render();
    return rec;
  }

  async function clear() {
    messages = []; savedBytes = 0;
    localStorage.removeItem(K.msgs); localStorage.removeItem(K.saved);
    render();
  }

  function localBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS) && k !== K.key) total += utf8(k) + utf8(localStorage.getItem(k) || '');
    }
    return total;
  }

  function render() {
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set('edge-local-size', fmt(localBytes()));
    set('edge-saved', fmt(savedBytes));
    set('edge-cipher', cipherLabel);
    const raw = localStorage.getItem(K.msgs) || '';
    const view = {
      [K.msgs]: raw ? { bytes: utf8(raw), format: raw.slice(0, raw.indexOf(':') + 1), cipher_preview: raw.slice(raw.indexOf(':') + 1, raw.indexOf(':') + 25) + '...' } : null,
      [K.saved]: savedBytes,
      turns_cached: messages.length,
      last_turns: messages.slice(-3).map((m) => ({ id: m.id, role: m.role, ts: m.ts, text: m.content.length > 56 ? m.content.slice(0, 56) + '...' : m.content }))
    };
    const pre = document.getElementById('edge-keys');
    if (pre) pre.textContent = JSON.stringify(view, null, 2);
  }

  window.EdgeMemory = { init, add, clear, render, history: () => messages.slice(), bytesSaved: () => savedBytes, utf8, fmt };
})();
