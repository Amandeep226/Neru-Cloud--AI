/* Wires chat UI, quick demos, backend calls (with automatic offline simulation) and edge memory. */
(function () {
  const API = 'http://127.0.0.1:5000';
  const $ = (id) => document.getElementById(id);
  const log = $('chat-log'), input = $('chat-input'), sendBtn = $('btn-send');
  let backend = { online: false, llm: false };
  let busy = false;

  /* ---------- offline simulation (mirrors backend/app.py) ---------- */
  function simReply(text) {
    const m = text.toLowerCase(), has = (...w) => w.some((x) => m.includes(x));
    if (has('water', 'wue', 'evapor')) return 'Evaporative cooling can consume roughly 1.8 L of freshwater per kWh. NeuroCloud routes inference to dry-cooled photonic nodes that reject heat through closed-loop dry coolers, so the modelled WUE is 0.00 L/kWh. Every request adds its avoided litres to your ESG ledger.';
    if (has('thermal', 'heat', 'cool', 'delta')) return 'Before dispatch, the router estimates the heat a request will add (the thermal delta, ΔT) from its size. Light prompts go to the photonic node, heavier ones to the closed-loop immersion node, and the evaporative cluster is never used.';
    if (has('memory', 'privacy', 'storage', 'database', 'local', 'history', 'stored')) return "Your conversation lives in this browser's localStorage, encrypted with AES-GCM. The router does not write chat history to a central database, so the Cloud DB Writes counter stays at 0. Use Clear Local Edge Cache to erase it.";
    if (has('train', 'workload', 'gpu', 'batch', 'fine-tun')) return 'For heavy jobs, use the workload buttons: the orchestrator estimates energy and thermal load from GPU count and hours, picks a dry-cooled or closed-loop node, and reports the freshwater an evaporative site would have used.';
    if (has('iso', 'esg', 'certificate', '14046')) return 'The certificate card summarises water saved, thermal delta and bypassed database writes for this session. It is a self-generated prototype record, not a third-party ISO 14046 audit.';
    if (has('hello', 'hi', 'hey')) return "Hello! I'm NeuroCloud AI. Ask about zero-water routing, edge memory or the ESG certificate.";
    return 'Request received and routed through the zero-water path. In offline simulation I can explain dry-cooled routing, edge memory, thermal prediction and the ESG certificate. Start backend/app.py with a GEMINI_API_KEY for live answers on any topic.';
  }

  function simTelemetry(prompt, reply, kind, o) {
    o = o || {};
    const tokens = Math.max(1, Math.floor((prompt.length + reply.length) / 4));
    const energy = o.energy != null ? o.energy : +(0.0002 + tokens * 0.0000008).toFixed(6);
    const seed = parseInt(Telemetry.hash(prompt).slice(-4), 16);
    const dt = o.dt != null ? o.dt : +(0.6 + tokens * 0.004 + (seed % 40) / 100).toFixed(2);
    const node = o.node || (tokens < 400 ? 'photonic' : 'immersion');
    const label = node === 'photonic' ? 'NeuroNode-Photonic-04 [Dry-Cooled]' : 'NeuroNode-Immersion-02 [Closed-Loop]';
    const water = +(energy * Telemetry.WUE_EVAP).toFixed(6);
    return {
      kind, tokens, energy_kwh: energy, water_saved_l: water, delta_t_c: dt, node, node_label: label, wue: 0,
      db_bytes_bypassed: o.bytes != null ? o.bytes : EdgeMemory.utf8(prompt + reply), latency_ms: 38 + (tokens % 61),
      route: [
        'Intercepted ' + kind + ' request - cloud chat DB write blocked (0 bytes written)',
        'Thermal model: predicted spike +' + dt.toFixed(2) + ' C for ~' + tokens + ' tokens',
        'Legacy-EvapCluster-01 bypassed - ' + water.toFixed(6) + ' L freshwater avoided (1.8 L/kWh baseline)',
        'Routed to ' + label + ' at 0.00 L/kWh WUE (offline simulation)'
      ]
    };
  }

  function simWorkload(name, gpus, hours) {
    const power = +(gpus * 0.7).toFixed(2), energy = +(power * hours).toFixed(3), dt = +(6 + gpus * 0.05).toFixed(1);
    const node = gpus >= 64 ? 'immersion' : 'photonic';
    const summary = "Workload '" + name + "': " + gpus + ' GPUs x ' + hours + ' h = ' + energy.toLocaleString() + ' kWh. Predicted ΔT +' + dt + ' °C. Routed to ' +
      (node === 'immersion' ? 'closed-loop immersion' : 'dry-cooled photonic') + ' node; an evaporative site would have used about ' + (energy * 1.8).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' L of freshwater.';
    return { summary, telemetry: simTelemetry(JSON.stringify({ name, gpus, hours }), summary, 'workload', { energy, dt, node, bytes: 160 }) };
  }

  /* ---------- UI ---------- */
  function bubble(role, text, note) {
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : role === 'system' ? 'sys' : 'ai');
    d.textContent = text;
    if (note) { const s = document.createElement('small'); s.textContent = note; d.appendChild(s); }
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  const noteFor = (src, t) => (src === 'gemini' ? 'Gemini 2.5 Flash' : src === 'offline' ? 'Offline simulation' : 'Backend simulation') + ' via ' + t.node_label + ' - ' + t.latency_ms + ' ms';

  function setMode() {
    const dot = $('mode-dot'), badge = $('mode-badge');
    dot.className = 'pulse-dot' + (backend.online ? (backend.llm ? '' : ' cyan') : ' off');
    badge.textContent = backend.online
      ? (backend.llm ? 'Backend online - Gemini 2.5 Flash (prompts are sent to Google)' : 'Backend online - deterministic simulation')
      : 'Offline simulation (backend not running)';
  }

  async function api(path, body, timeout) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout || 20000);
    try {
      const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  async function checkBackend() {
    try { const h = await api('/api/health', null, 1500); backend = { online: !!h.ok, llm: !!h.llm }; }
    catch (e) { backend = { online: false, llm: false }; }
    setMode();
  }

  function setBusy(v) { busy = v; sendBtn.disabled = v; input.disabled = v; if (!v) input.focus(); }

  async function sendMessage(text) {
    text = text.trim();
    if (!text || busy) return;
    setBusy(true);
    const history = EdgeMemory.history().filter((m) => m.role !== 'system').slice(-10).map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.content }));
    bubble('user', text); await EdgeMemory.add('user', text);
    const typing = document.createElement('div'); typing.className = 'msg ai typing'; typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    let reply, source, tel;
    try {
      const d = await api('/api/chat', { message: text, history });
      reply = d.reply; source = d.source; tel = d.telemetry; backend.online = true;
    } catch (e) {
      backend.online = false; backend.llm = false;
      reply = simReply(text); source = 'offline'; tel = simTelemetry(text, reply, 'chat');
    }
    setMode(); typing.remove();
    bubble('ai', reply, noteFor(source, tel));
    const rec = await EdgeMemory.add('ai', reply, { source });
    Telemetry.apply(tel, 'Context persisted to Local Edge Storage (' + EdgeMemory.utf8(JSON.stringify(rec)) + ' bytes, 0 cloud DB writes)');
    setBusy(false);
  }

  async function runWorkload(name, gpus, hours) {
    if (busy) return;
    setBusy(true);
    bubble('user', 'Profile workload: ' + name + ' (' + gpus + ' GPUs, ' + hours + ' h)');
    await EdgeMemory.add('user', 'Workload: ' + name + ' (' + gpus + ' GPUs, ' + hours + ' h)');
    let summary, tel, source = 'backend';
    try {
      const d = await api('/api/orchestrate', { name, gpus, hours });
      summary = d.summary; tel = d.telemetry; backend.online = true;
    } catch (e) {
      backend.online = false; backend.llm = false; source = 'offline';
      const s = simWorkload(name, gpus, hours); summary = s.summary; tel = s.telemetry;
    }
    setMode();
    bubble('system', summary, noteFor(source, tel));
    await EdgeMemory.add('system', summary, { source });
    Telemetry.apply(tel, 'Workload profile persisted to Local Edge Storage (0 cloud DB writes)');
    setBusy(false);
  }

  function welcome() {
    bubble('system', 'Chat history stays in this browser. Each request is intercepted, thermally profiled and routed to a dry-cooled or closed-loop node. Try a prompt or workload below.');
  }

  async function boot() {
    Telemetry.render();
    const saved = await EdgeMemory.init();
    welcome();
    saved.forEach((m) => bubble(m.role, m.content, m.source ? (m.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Simulation') + ' (restored from edge memory)' : null));
    Telemetry.render();
    checkBackend();
  }

  $('chat-form').addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; sendMessage(v); });
  document.querySelectorAll('.quick').forEach((b) => b.addEventListener('click', () => sendMessage(b.dataset.prompt)));
  document.querySelectorAll('.work').forEach((b) => b.addEventListener('click', () => runWorkload(b.dataset.name, parseInt(b.dataset.gpus, 10), parseFloat(b.dataset.hours))));
  $('btn-export').addEventListener('click', () => Telemetry.exportCertificate());
  $('btn-clear').addEventListener('click', async () => {
    if (!confirm('Erase all locally cached chat turns and reset telemetry totals?')) return;
    await EdgeMemory.clear(); Telemetry.reset(); log.textContent = ''; welcome();
    Telemetry.addLog('Local Edge Cache cleared by user'); Telemetry.render();
  });
  boot();
})();
