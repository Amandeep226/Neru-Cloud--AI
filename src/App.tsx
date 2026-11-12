import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LeftColumn } from './components/LeftColumn';
import { CenterColumn } from './components/CenterColumn';
import { RightColumn } from './components/RightColumn';
import { CustomWorkloadModal } from './components/CustomWorkloadModal';
import { Message, TelemetryState, EdgeMemoryStats } from './types';
import {
  encryptMessages,
  decryptMessages,
  STORAGE_KEYS,
  getEdgeMemoryStats,
  clearEdgeMemory,
  utf8ByteLength,
} from './utils/crypto';
import {
  loadTelemetry,
  saveTelemetry,
  applyTelemetryPayload,
  createFreshTelemetry,
  getOfflineDeterministicReply,
  getOfflineDeterministicWorkload,
} from './utils/telemetry';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryState>(loadTelemetry);
  const [edgeStats, setEdgeStats] = useState<EdgeMemoryStats>({
    localBytes: 0,
    savedBytes: 0,
    cipherLabel: 'AES-256-GCM',
    turnsCached: 0,
    rawPayloadPreview: '',
    rawLength: 0,
    jwkExport: '',
  });

  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [hasLlm, setHasLlm] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState<boolean>(false);

  // Check backend server status
  const checkBackend = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setBackendOnline(true);
        setHasLlm(!!data.llm);
      } else {
        setBackendOnline(false);
        setHasLlm(false);
      }
    } catch {
      setBackendOnline(false);
      setHasLlm(false);
    }
  }, []);

  // Initialize Edge Memory on mount
  useEffect(() => {
    async function boot() {
      // Check backend
      await checkBackend();

      // Read raw from localStorage and decrypt
      const rawStored = localStorage.getItem(STORAGE_KEYS.messages);
      let loadedMessages: Message[] = [];
      if (rawStored) {
        loadedMessages = await decryptMessages(rawStored);
      }

      // If no stored messages, insert welcome message
      if (loadedMessages.length === 0) {
        const welcomeMsg: Message = {
          id: 'welcome-init',
          role: 'system',
          content:
            'Autonomous Zero-Water compute router initialized. Chat history is encrypted in-browser via AES-256-GCM (0 central DB writes). Every request is thermally predicted and dispatched to dry-cooled photonic or closed-loop immersion nodes at 0.00 L/kWh WUE.',
          ts: new Date().toISOString(),
          source: 'offline',
        };
        loadedMessages = [welcomeMsg];
        const encrypted = await encryptMessages(loadedMessages);
        localStorage.setItem(STORAGE_KEYS.messages, encrypted);
      }

      setMessages(loadedMessages);
      setEdgeStats(getEdgeMemoryStats(loadedMessages));
    }

    boot();
  }, [checkBackend]);

  // Sync edge stats whenever messages change
  const refreshStats = useCallback((msgs: Message[]) => {
    setEdgeStats(getEdgeMemoryStats(msgs));
  }, []);

  // Send Chat Message Handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isBusy) return;
    setIsBusy(true);

    const userMsg: Message = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      ts: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);

    // Save user turn to local AES vault immediately
    const userPayloadBytes = utf8ByteLength(JSON.stringify(userMsg));
    const currentSaved = parseInt(localStorage.getItem(STORAGE_KEYS.savedBytes) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.savedBytes, String(currentSaved + userPayloadBytes));
    const encUser = await encryptMessages(updatedWithUser);
    localStorage.setItem(STORAGE_KEYS.messages, encUser);
    refreshStats(updatedWithUser);

    let replyText = '';
    let replySource: 'gemini' | 'simulation' | 'offline' = 'simulation';
    let telPayload: any = null;

    // Try backend if online
    try {
      const historyForApi = updatedWithUser
        .filter((m) => m.role !== 'system')
        .slice(-8)
        .map((m) => ({
          role: m.role === 'ai' ? 'model' : 'user',
          content: m.content,
        }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyForApi }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        replyText = data.reply;
        replySource = data.source;
        telPayload = data.telemetry;
        setBackendOnline(true);
        if (data.source === 'gemini') setHasLlm(true);
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch {
      // Deterministic offline fallback
      setBackendOnline(false);
      setHasLlm(false);
      const fallback = getOfflineDeterministicReply(text);
      replyText = fallback.reply;
      replySource = 'offline';
      telPayload = fallback.telemetry;
    }

    // Build AI Message
    const aiMsg: Message = {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'ai',
      content: replyText,
      ts: new Date().toISOString(),
      source: replySource,
      node_label: telPayload?.node_label,
      latency_ms: telPayload?.latency_ms,
      tokens: telPayload?.tokens,
      water_saved_l: telPayload?.water_saved_l,
      delta_t_c: telPayload?.delta_t_c,
    };

    const finalMessages = [...updatedWithUser, aiMsg];
    setMessages(finalMessages);

    // Encrypt AI response into AES-256-GCM localStorage
    const aiPayloadBytes = utf8ByteLength(JSON.stringify(aiMsg));
    const nowSaved = parseInt(localStorage.getItem(STORAGE_KEYS.savedBytes) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.savedBytes, String(nowSaved + aiPayloadBytes));
    const encAll = await encryptMessages(finalMessages);
    localStorage.setItem(STORAGE_KEYS.messages, encAll);
    refreshStats(finalMessages);

    // Update telemetry state
    if (telPayload) {
      setTelemetry((prev) =>
        applyTelemetryPayload(
          prev,
          telPayload,
          `Edge memory encrypted: ${aiPayloadBytes} B sealed with AES-256-GCM (0 cloud DB writes)`
        )
      );
    }

    setIsBusy(false);
  };

  // Run Cluster Workload Handler
  const handleRunWorkload = async (name: string, gpus: number, hours: number) => {
    if (isBusy) return;
    setIsBusy(true);

    const userWorkloadMsg: Message = {
      id: `uw-${Date.now()}`,
      role: 'user',
      content: `Profile & Dispatch Workload: ${name} (${gpus} GPUs, ${hours} h duration)`,
      ts: new Date().toISOString(),
    };

    const withUser = [...messages, userWorkloadMsg];
    setMessages(withUser);

    let summary = '';
    let telPayload: any = null;
    let source: 'gemini' | 'simulation' | 'offline' = 'simulation';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gpus, hours }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        summary = data.summary;
        telPayload = data.telemetry;
        source = 'simulation';
      } else {
        throw new Error('Orchestrate failed');
      }
    } catch {
      const fallback = getOfflineDeterministicWorkload(name, gpus, hours);
      summary = fallback.summary;
      telPayload = fallback.telemetry;
      source = 'offline';
    }

    const sysMsg: Message = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: summary,
      ts: new Date().toISOString(),
      source,
      node_label: telPayload?.node_label,
      latency_ms: telPayload?.latency_ms,
      water_saved_l: telPayload?.water_saved_l,
      delta_t_c: telPayload?.delta_t_c,
    };

    const allMsgs = [...withUser, sysMsg];
    setMessages(allMsgs);

    const enc = await encryptMessages(allMsgs);
    localStorage.setItem(STORAGE_KEYS.messages, enc);
    refreshStats(allMsgs);

    if (telPayload) {
      setTelemetry((prev) =>
        applyTelemetryPayload(
          prev,
          telPayload,
          `Workload profile sealed into Local Edge Vault (${telPayload.db_bytes_bypassed} bytes, 0 Cloud DB writes)`
        )
      );
    }

    setIsBusy(false);
  };

  // Clear Edge Memory Cache
  const handleClearCache = async () => {
    if (
      !window.confirm(
        'Erase all encrypted local edge messages and reset live session telemetry totals?'
      )
    ) {
      return;
    }

    clearEdgeMemory();
    const freshTel = createFreshTelemetry();
    setTelemetry(freshTel);
    saveTelemetry(freshTel);

    const welcomeMsg: Message = {
      id: `welcome-${Date.now()}`,
      role: 'system',
      content:
        'Local Edge Cache erased. Vault zeroed (0 bytes). Autonomous zero-water compute router ready.',
      ts: new Date().toISOString(),
      source: 'offline',
    };

    const freshList = [welcomeMsg];
    setMessages(freshList);
    const enc = await encryptMessages(freshList);
    localStorage.setItem(STORAGE_KEYS.messages, enc);
    refreshStats(freshList);
  };

  // Reset Session
  const handleResetSession = () => {
    if (
      !window.confirm(
        'Start a new session? This generates a fresh Certificate ID while keeping existing edge memory intact.'
      )
    ) {
      return;
    }
    const fresh = createFreshTelemetry();
    setTelemetry(fresh);
    saveTelemetry(fresh);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        backendOnline={backendOnline}
        hasLlm={hasLlm}
        sessionId={telemetry.session}
        onOpenWorkloadModal={() => setIsWorkloadModalOpen(true)}
        onResetSession={handleResetSession}
      />

      {/* Main 3-Column Glassmorphic Dashboard */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)_360px] lg:h-[calc(100vh-66px)] lg:overflow-hidden min-h-0">
        {/* Left Column: Local Edge Storage & Node Topology */}
        <LeftColumn
          stats={edgeStats}
          messages={messages}
          nodeLoads={telemetry.loads}
          onClearCache={handleClearCache}
        />

        {/* Center Column: NeuroCloud AI Chat & Workload Simulator */}
        <CenterColumn
          messages={messages}
          isBusy={isBusy}
          onSendMessage={handleSendMessage}
          onRunWorkload={handleRunWorkload}
          onOpenCustomWorkload={() => setIsWorkloadModalOpen(true)}
        />

        {/* Right Column: Live Telemetry, Audit Log & ISO-14046 Certificate */}
        <RightColumn telemetry={telemetry} />
      </main>

      {/* Modal for Custom GPU Cluster Simulation */}
      <CustomWorkloadModal
        isOpen={isWorkloadModalOpen}
        onClose={() => setIsWorkloadModalOpen(false)}
        onDispatch={handleRunWorkload}
        isBusy={isBusy}
      />
    </div>
  );
}
