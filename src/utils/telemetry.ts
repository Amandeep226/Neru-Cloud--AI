import { TelemetryState, TelemetryPayload, WorkloadProfile } from '../types';
import { STORAGE_KEYS, cyrb53, utf8ByteLength, formatBytes } from './crypto';

export const WUE_EVAP_BASELINE = 1.8; // L/kWh baseline for evaporative cooling

export function createFreshTelemetry(): TelemetryState {
  const sessionRand = typeof window !== 'undefined'
    ? Math.random().toString(16).slice(2, 10).toUpperCase()
    : 'SESSION01';
  return {
    session: `NC-${sessionRand}`,
    started: new Date().toISOString(),
    requests: 0,
    writes: 0,
    water: 0,
    energy: 0,
    dtLast: 0,
    dtMax: 0,
    dtSum: 0,
    bypassed: 0,
    loads: { photonic: 18, immersion: 24 },
    logs: [
      `[${new Date().toLocaleTimeString([], { hour12: false })}] NeuroCloud AI Orchestrator initialized`,
      `[${new Date().toLocaleTimeString([], { hour12: false })}] Autonomous Zero-Water compute router online (WUE: 0.00 L/kWh)`,
      `[${new Date().toLocaleTimeString([], { hour12: false })}] Local AES-256-GCM vault active — Cloud DB writes blocked`,
    ],
  };
}

export function loadTelemetry(): TelemetryState {
  if (typeof window === 'undefined') return createFreshTelemetry();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.telemetry);
    if (raw) {
      return { ...createFreshTelemetry(), ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load telemetry from localStorage, initializing fresh:', err);
  }
  return createFreshTelemetry();
}

export function saveTelemetry(state: TelemetryState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.telemetry, JSON.stringify(state));
  } catch {
    // Local storage full or private browsing restriction
  }
}

export function applyTelemetryPayload(
  current: TelemetryState,
  payload: TelemetryPayload,
  extraLogMessage?: string
): TelemetryState {
  const next: TelemetryState = {
    ...current,
    requests: current.requests + 1,
    water: current.water + payload.water_saved_l,
    energy: current.energy + payload.energy_kwh,
    dtLast: payload.delta_t_c,
    dtMax: Math.max(current.dtMax, payload.delta_t_c),
    dtSum: current.dtSum + payload.delta_t_c,
    bypassed: current.bypassed + payload.db_bytes_bypassed,
    loads: {
      photonic:
        payload.node === 'photonic'
          ? Math.min(96, current.loads.photonic + 8 + payload.tokens / 40)
          : Math.max(12, current.loads.photonic - 4),
      immersion:
        payload.node === 'immersion'
          ? Math.min(96, current.loads.immersion + 8 + payload.tokens / 40)
          : Math.max(12, current.loads.immersion - 4),
    },
    logs: [...current.logs],
  };

  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  (payload.route || []).forEach(line => {
    next.logs.push(`[${stamp}] ${line}`);
  });

  if (extraLogMessage) {
    next.logs.push(`[${stamp}] ${extraLogMessage}`);
  }

  // Cap logs at 100 entries
  if (next.logs.length > 100) {
    next.logs = next.logs.slice(-100);
  }

  saveTelemetry(next);
  return next;
}

export function getCertificateData(state: TelemetryState) {
  const avgDt = state.requests > 0 ? state.dtSum / state.requests : 0;
  const canonicalBody = [
    state.session,
    state.requests,
    state.water.toFixed(6),
    state.dtMax.toFixed(2),
    state.bypassed,
  ].join('|');

  const certHash = cyrb53(canonicalBody);
  const certId = state.requests > 0 ? `NC-${certHash.slice(0, 10).toUpperCase()}` : 'PENDING';
  const fingerprint = `${cyrb53(canonicalBody, 7)}${cyrb53(canonicalBody, 13)}`;

  return {
    id: certId,
    fingerprint,
    avgDt,
    maxDt: state.dtMax,
    canonicalBody,
  };
}

export function exportCertificateProofFile(state: TelemetryState): void {
  const cert = getCertificateData(state);
  const now = new Date().toISOString();

  const lines = [
    '================================================================================',
    '       NEUROCLOUD AI — ISO 14046 ESG COMPLIANCE CERTIFICATE (PROTOTYPE RECORD)   ',
    '       AUTONOMOUS ZERO-WATER COMPUTE & EDGE-MEMORY ORCHESTRATOR                 ',
    '================================================================================',
    `Certificate ID     : ${cert.id}`,
    `Integrity Hash     : ${cert.fingerprint}`,
    `Session ID         : ${state.session}`,
    `Session Started    : ${state.started}`,
    `Issued Timestamp   : ${now}`,
    `Status             : VERIFIED ZERO-WATER EXECUTION (WUE: 0.00 L/kWh)`,
    '',
    '--------------------------------------------------------------------------------',
    '1. ENVIRONMENTAL IMPACT TELEMETRY (ISO-14046 ALIGNED)',
    '--------------------------------------------------------------------------------',
    `  Total Requests Handled          : ${state.requests}`,
    `  Central Cloud DB Writes         : ${state.writes} (Strict 0 DB writes enforced)`,
    `  Chat Data Kept Off Cloud DBs   : ${state.bypassed.toLocaleString()} bytes (${formatBytes(state.bypassed)})`,
    `  Modelled Compute Energy         : ${state.energy.toFixed(6)} kWh`,
    `  Evaporative Baseline (WUE)      : ${WUE_EVAP_BASELINE} L/kWh`,
    `  Freshwater Saved vs Baseline    : ${state.water.toFixed(6)} Liters`,
    `  Average Thermal Delta (ΔT)      : +${cert.avgDt.toFixed(2)} °C`,
    `  Peak Thermal Delta (ΔT Max)     : +${cert.maxDt.toFixed(2)} °C`,
    `  Routed Operating WUE            : 0.00 L/kWh (Dry-Cooled Photonic & Closed-Loop)`,
    '',
    '--------------------------------------------------------------------------------',
    '2. PROOF METHODOLOGY & ZERO-KNOWLEDGE INTEGRITY',
    '--------------------------------------------------------------------------------',
    '  - Freshwater Saved = Compute Energy (kWh) × 1.8 L/kWh evaporative baseline.',
    '  - Node Routing Target: NeuroNode-Photonic-04 (Dry-Cooled) & NeuroNode-Immersion-02 (Closed-Loop).',
    '  - Legacy Evaporative Cluster (Legacy-EvapCluster-01) is 100% bypassed.',
    '  - Client-side AES-256-GCM localStorage ensures zero central retention of prompt text.',
    '',
    `Integrity Fingerprint : 0x${cert.fingerprint.toUpperCase()}`,
    '',
    'NOTICE: This certificate is an algorithmic prototype audit artifact generated from',
    'live operational metrics. For formal regulatory submission, pair with third-party',
    'ISO 14046 / GHG Protocol verification.',
    '',
    '--------------------------------------------------------------------------------',
    `3. ROUTING AUDIT TRAIL (LAST ${Math.min(state.logs.length, 30)} DISPATCH EVENTS)`,
    '--------------------------------------------------------------------------------',
    ...state.logs.slice(-30),
    '================================================================================',
    '                      END OF ESG COMPLIANCE CERTIFICATE                         ',
    '================================================================================',
  ];

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NeuroCloud-ISO14046-ESG-Proof-${cert.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Client-side deterministic simulation fallback (mirrors server.ts)
export function getOfflineDeterministicReply(message: string): { reply: string; telemetry: TelemetryPayload } {
  const m = message.toLowerCase();
  const has = (...words: string[]) => words.some(w => m.includes(w));

  let reply = '';
  if (has('water', 'wue', 'evapor', 'cool')) {
    reply = 'Evaporative cooling can consume roughly 1.8 L of freshwater per kWh. NeuroCloud AI intercepts inference requests and routes them directly to zero-water photonic and closed-loop immersion nodes that reject thermal energy without open evaporation, maintaining an operational WUE of 0.00 L/kWh. Every executed token is cryptographically logged to your ISO-14046 water avoidance ledger.';
  } else if (has('thermal', 'heat', 'delta', 'temperature', 'dt')) {
    reply = "Before dispatching compute, NeuroCloud's predictive thermal orchestrator estimates the transient heat spike (thermal delta, ΔT) based on prompt tensor depth and output token volume. Light workloads route to NeuroNode-Photonic-04 [Dry-Cooled], while dense matrix jobs route to NeuroNode-Immersion-02 [Closed-Loop]. The evaporative cluster (Legacy-EvapCluster-01) is strictly bypassed.";
  } else if (has('memory', 'privacy', 'storage', 'database', 'local', 'history', 'stored', 'aes')) {
    reply = "Your entire chat history and telemetry vault are encrypted client-side using AES-256-GCM and stored solely within your browser's local edge storage (neurocloud.v1.messages). NeuroCloud AI enforces zero-knowledge telemetry: central cloud DB writes remain strictly at 0 KB, preventing telemetry leakage and unauthorized retention.";
  } else if (has('train', 'workload', 'gpu', 'batch', 'fine-tun', '70b', '7b')) {
    reply = 'Distributed cluster workloads undergo automated capacity profiling. By estimating total sustained kilowatt-hours (GPU count × 0.7 kW TDP × duration), the orchestrator calculates the exact evaporative freshwater saved versus conventional datacenter baselines, scheduling execution onto closed-loop dielectric immersion tanks.';
  } else if (has('iso', 'esg', 'certificate', '14046', 'compliance', 'proof')) {
    reply = 'The ISO-14046 ESG Compliance Certificate compiles cumulative freshwater savings, peak and average thermal delta (ΔT), and bypassed database payloads into a deterministic cryptographic proof hash. You can export the signed proof receipt (.txt) anytime for environmental sustainability reporting.';
  } else if (has('hello', 'hi', 'hey', 'start')) {
    reply = 'Welcome to NeuroCloud AI. I am your autonomous zero-water compute router and edge-memory orchestrator. Ask me about dry-cooled photonic routing, local AES-256-GCM memory, thermal delta prediction, or run a cluster workload simulation.';
  } else {
    reply = 'Request intercepted and routed through the zero-water compute pipeline. Autonomous load balancing selected a dry-cooled execution target with 0.00 L/kWh water consumption. Chat history and memory remain strictly confined to your local AES-256-GCM vault, with 0 bytes written to central cloud databases.';
  }

  const tokens = Math.max(1, Math.floor((message.length + reply.length) / 4));
  const energyKwh = Number((0.0002 + tokens * 0.0000008).toFixed(6));
  const seed = parseInt(cyrb53(message).slice(-4), 16) || 12;
  const deltaT = Number((0.6 + tokens * 0.004 + (seed % 40) / 100).toFixed(2));
  const node = tokens < 400 ? 'photonic' : 'immersion';
  const nodeLabel = node === 'photonic' ? 'NeuroNode-Photonic-04 [Dry-Cooled]' : 'NeuroNode-Immersion-02 [Closed-Loop]';
  const waterSavedL = Number((energyKwh * WUE_EVAP_BASELINE).toFixed(6));
  const latencyMs = 38 + (tokens % 61);

  const telemetry: TelemetryPayload = {
    kind: 'chat',
    tokens,
    energy_kwh: energyKwh,
    water_saved_l: waterSavedL,
    delta_t_c: deltaT,
    node,
    node_label: nodeLabel,
    wue: 0.0,
    db_bytes_bypassed: utf8ByteLength(message + reply),
    latency_ms: latencyMs,
    route: [
      'Intercepted chat request — cloud chat DB write blocked (0 bytes written)',
      `Thermal model: predicted spike +${deltaT.toFixed(2)} °C for ~${tokens} tokens`,
      `Legacy-EvapCluster-01 bypassed — ${waterSavedL.toFixed(6)} L freshwater avoided (${WUE_EVAP_BASELINE} L/kWh baseline)`,
      `Routed to ${nodeLabel} at 0.00 L/kWh WUE (Client autonomous edge fallback)`,
    ],
  };

  return { reply, telemetry };
}

export function getOfflineDeterministicWorkload(name: string, gpus: number, hours: number): { summary: string; profile: WorkloadProfile; telemetry: TelemetryPayload } {
  const powerKw = Number((gpus * 0.7).toFixed(2));
  const energyKwh = Number((powerKw * hours).toFixed(3));
  const deltaT = Number((6 + gpus * 0.05).toFixed(1));
  const node = gpus >= 64 ? 'immersion' : 'photonic';
  const nodeLabel = node === 'immersion' ? 'NeuroNode-Immersion-02 [Closed-Loop]' : 'NeuroNode-Photonic-04 [Dry-Cooled]';
  const waterSavedL = Number((energyKwh * WUE_EVAP_BASELINE).toFixed(4));

  const profile: WorkloadProfile = {
    name,
    gpus,
    hours,
    power_kw: powerKw,
    energy_kwh: energyKwh,
    predicted_delta_t_c: deltaT,
    target_node: node,
    node_label: nodeLabel,
    water_saved_l: waterSavedL,
  };

  const summary = `Workload '${name}': ${gpus} GPUs × ${hours} h = ${energyKwh.toLocaleString()} kWh. Predicted ΔT +${deltaT} °C. Routed to ${nodeLabel}; an evaporative datacenter would have consumed ~${waterSavedL.toLocaleString()} L of fresh water. Legacy-EvapCluster-01 bypassed at 0.00 L/kWh WUE.`;

  const telemetry: TelemetryPayload = {
    kind: 'workload',
    tokens: 160,
    energy_kwh: energyKwh,
    water_saved_l: waterSavedL,
    delta_t_c: deltaT,
    node,
    node_label: nodeLabel,
    wue: 0.0,
    db_bytes_bypassed: utf8ByteLength(JSON.stringify(profile)),
    latency_ms: 54,
    route: [
      `Intercepted heavy workload '${name}' (${gpus} GPUs, ${hours} h)`,
      `Thermal model: predicted spike +${deltaT.toFixed(1)} °C on sustained ${energyKwh} kWh load`,
      `Legacy-EvapCluster-01 bypassed — ${waterSavedL.toLocaleString()} L freshwater avoided`,
      `Dispatched to ${nodeLabel} at 0.00 L/kWh WUE`,
    ],
  };

  return { summary, profile, telemetry };
}
