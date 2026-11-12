export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  ts: string;
  source?: 'gemini' | 'simulation' | 'offline';
  node_label?: string;
  latency_ms?: number;
  tokens?: number;
  water_saved_l?: number;
  delta_t_c?: number;
}

export interface TelemetryPayload {
  kind: string;
  tokens: number;
  energy_kwh: number;
  water_saved_l: number;
  delta_t_c: number;
  node: 'photonic' | 'immersion';
  node_label: string;
  wue: number;
  db_bytes_bypassed: number;
  latency_ms: number;
  route: string[];
}

export interface TelemetryState {
  session: string;
  started: string;
  requests: number;
  writes: number;
  water: number;
  energy: number;
  dtLast: number;
  dtMax: number;
  dtSum: number;
  bypassed: number;
  loads: {
    photonic: number;
    immersion: number;
  };
  logs: string[];
}

export interface WorkloadProfile {
  name: string;
  gpus: number;
  hours: number;
  power_kw: number;
  energy_kwh: number;
  predicted_delta_t_c: number;
  target_node: string;
  node_label: string;
  water_saved_l: number;
}

export interface EdgeMemoryStats {
  localBytes: number;
  savedBytes: number;
  cipherLabel: string;
  turnsCached: number;
  rawPayloadPreview: string;
  rawLength: number;
  jwkExport: string;
}
