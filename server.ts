import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

const WUE_EVAP = 1.8; // L/kWh baseline for conventional evaporative data centers
const SYSTEM_PROMPT = `You are NeuroCloud AI, an intelligent autonomous zero-water compute router and edge-memory orchestrator.
Chat history is kept exclusively in the user's browser in an AES-256-GCM vault; no central cloud databases are ever written to.
All inference is routed to zero-water photonic and closed-loop dry-cooled nodes.
Answer clearly, technically, and concisely (under 160 words). Maintain a cutting-edge cyber-physical data center engineering tone.`;

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini 2.5 Flash initialized successfully');
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
    ai = null;
  }
} else {
  console.log('No GEMINI_API_KEY found, running with autonomous deterministic simulation');
}

function simulateReply(message: string): string {
  const m = message.toLowerCase();
  const has = (...words: string[]) => words.some(w => m.includes(w));

  if (has('water', 'wue', 'evapor', 'cool')) {
    return 'Evaporative cooling can consume roughly 1.8 L of freshwater per kWh. NeuroCloud AI intercepts inference requests and routes them directly to zero-water photonic and closed-loop immersion nodes that reject thermal energy without open evaporation, maintaining an operational WUE of 0.00 L/kWh. Every executed token is cryptographically logged to your ISO-14046 water avoidance ledger.';
  }
  if (has('thermal', 'heat', 'delta', 'temperature', 'dt')) {
    return "Before dispatching compute, NeuroCloud's predictive thermal orchestrator estimates the transient heat spike (thermal delta, ΔT) based on prompt tensor depth and output token volume. Light workloads route to NeuroNode-Photonic-04 [Dry-Cooled], while dense matrix jobs route to NeuroNode-Immersion-02 [Closed-Loop]. The evaporative cluster (Legacy-EvapCluster-01) is strictly bypassed.";
  }
  if (has('memory', 'privacy', 'storage', 'database', 'local', 'history', 'stored', 'aes')) {
    return "Your entire chat history and telemetry vault are encrypted client-side using AES-256-GCM and stored solely within your browser's local edge storage (neurocloud.v1.messages). NeuroCloud AI enforces zero-knowledge telemetry: central cloud DB writes remain strictly at 0 KB, preventing telemetry leakage and unauthorized retention.";
  }
  if (has('train', 'workload', 'gpu', 'batch', 'fine-tun', '70b', '7b')) {
    return 'Distributed cluster workloads undergo automated capacity profiling. By estimating total sustained kilowatt-hours (GPU count × 0.7 kW TDP × duration), the orchestrator calculates the exact evaporative freshwater saved versus conventional datacenter baselines, scheduling execution onto closed-loop dielectric immersion tanks.';
  }
  if (has('iso', 'esg', 'certificate', '14046', 'compliance', 'proof')) {
    return 'The ISO-14046 ESG Compliance Certificate compiles cumulative freshwater savings, peak and average thermal delta (ΔT), and bypassed database payloads into a deterministic cryptographic proof hash. You can export the signed proof receipt (.txt) anytime for environmental sustainability reporting.';
  }
  if (has('hello', 'hi', 'hey', 'start')) {
    return 'Welcome to NeuroCloud AI. I am your autonomous zero-water compute router and edge-memory orchestrator. Ask me about dry-cooled photonic routing, local AES-256-GCM memory, thermal delta prediction, or run a cluster workload simulation.';
  }
  return 'Request intercepted and routed through the zero-water compute pipeline. Autonomous load balancing selected a dry-cooled execution target with 0.00 L/kWh water consumption. Chat history and memory remain strictly confined to your local AES-256-GCM vault, with 0 bytes written to central cloud databases.';
}

function buildTelemetry(
  promptText: string,
  replyText: string,
  kind = 'chat',
  customEnergy?: number,
  customDt?: number,
  customNode?: string,
  customBytes?: number
) {
  const tokens = Math.max(1, Math.floor((promptText.length + replyText.length) / 4));
  const energyKwh = customEnergy !== undefined ? customEnergy : Number((0.0002 + tokens * 0.0000008).toFixed(6));

  let seed = 0;
  for (let i = 0; i < promptText.length; i++) {
    seed = (seed * 31 + promptText.charCodeAt(i)) >>> 0;
  }
  const deltaT = customDt !== undefined ? customDt : Number((0.6 + tokens * 0.004 + (seed % 40) / 100).toFixed(2));
  const node = customNode || (tokens < 400 ? 'photonic' : 'immersion');
  const nodeLabel = node === 'photonic' ? 'NeuroNode-Photonic-04 [Dry-Cooled]' : 'NeuroNode-Immersion-02 [Closed-Loop]';
  const dbBytes = customBytes !== undefined ? customBytes : Buffer.byteLength(promptText + replyText, 'utf8');
  const waterSavedL = Number((energyKwh * WUE_EVAP).toFixed(6));
  const latencyMs = 38 + (tokens % 61);

  return {
    kind,
    tokens,
    energy_kwh: energyKwh,
    water_saved_l: waterSavedL,
    delta_t_c: deltaT,
    node,
    node_label: nodeLabel,
    wue: 0.0,
    db_bytes_bypassed: dbBytes,
    latency_ms: latencyMs,
    route: [
      `Intercepted ${kind} request — cloud chat DB write blocked (0 bytes written)`,
      `Thermal model: predicted spike +${deltaT.toFixed(2)} °C for ~${tokens} tokens`,
      `Legacy-EvapCluster-01 bypassed — ${waterSavedL.toFixed(6)} L freshwater avoided (${WUE_EVAP} L/kWh baseline)`,
      `Routed to ${nodeLabel} at 0.00 L/kWh WUE`,
    ],
  };
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    llm: ai !== null,
    model: ai !== null ? 'gemini-2.5-flash' : 'simulation',
    wueBaseline: WUE_EVAP,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    const cleanMsg = String(message || '').trim().slice(0, 4000);
    if (!cleanMsg) {
      return res.status(400).json({ error: 'Message is empty.' });
    }

    let reply = '';
    let source = 'simulation';

    if (ai) {
      try {
        const transcript = Array.isArray(history)
          ? history.slice(-8).map((h: any) => `${h.role === 'model' || h.role === 'ai' ? 'assistant' : 'user'}: ${h.content}`).join('\n')
          : '';
        const prompt = transcript ? `${transcript}\nuser: ${cleanMsg}` : cleanMsg;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 700,
          },
        });
        reply = (response.text || '').trim();
        if (reply) {
          source = 'gemini';
        }
      } catch (geminiErr) {
        console.warn('Gemini call failed, using deterministic simulation:', geminiErr);
        reply = '';
      }
    }

    if (!reply) {
      reply = simulateReply(cleanMsg);
      source = 'simulation';
    }

    const telemetry = buildTelemetry(cleanMsg, reply, 'chat');
    return res.json({
      reply,
      source,
      telemetry,
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    const fallbackReply = simulateReply(String(req.body?.message || ''));
    const telemetry = buildTelemetry(String(req.body?.message || ''), fallbackReply, 'chat');
    return res.json({
      reply: fallbackReply,
      source: 'simulation',
      telemetry,
    });
  }
});

app.post('/api/orchestrate', (req, res) => {
  try {
    const { name = 'Custom workload', gpus: rawGpus = 8, hours: rawHours = 1 } = req.body || {};
    const gpus = Math.min(100000, Math.max(1, Number(rawGpus) || 8));
    const hours = Math.min(10000, Math.max(0.1, Number(rawHours) || 1));
    const powerKw = Number((gpus * 0.7).toFixed(2));
    const energyKwh = Number((powerKw * hours).toFixed(3));
    const deltaT = Number((6 + gpus * 0.05).toFixed(1));
    const node = gpus >= 64 ? 'immersion' : 'photonic';
    const nodeLabel = node === 'immersion' ? 'NeuroNode-Immersion-02 [Closed-Loop]' : 'NeuroNode-Photonic-04 [Dry-Cooled]';
    const waterSavedL = Number((energyKwh * WUE_EVAP).toFixed(4));

    const profile = {
      name: String(name).slice(0, 80),
      gpus,
      hours,
      power_kw: powerKw,
      energy_kwh: energyKwh,
      predicted_delta_t_c: deltaT,
      target_node: node,
      node_label: nodeLabel,
      water_saved_l: waterSavedL,
    };

    const summary = `Workload '${profile.name}': ${gpus} GPUs × ${hours} h = ${energyKwh.toLocaleString()} kWh. Predicted ΔT +${deltaT} °C. Routed to ${nodeLabel}; an evaporative cooling datacenter would have consumed ~${waterSavedL.toLocaleString()} L of fresh water. Legacy-EvapCluster-01 bypassed at 0.00 L/kWh WUE.`;

    const telemetry = buildTelemetry(
      JSON.stringify(profile),
      summary,
      'workload',
      energyKwh,
      deltaT,
      node,
      Buffer.byteLength(JSON.stringify(profile), 'utf8')
    );

    return res.json({
      profile,
      summary,
      telemetry,
    });
  } catch (err) {
    console.error('Orchestrate endpoint error:', err);
    return res.status(500).json({ error: 'Failed to profile workload' });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NeuroCloud AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
