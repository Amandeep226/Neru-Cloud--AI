import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  HardDrive,
  Trash2,
  Copy,
  Check,
  Code2,
  Cpu,
  Layers,
  KeyRound,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Message, EdgeMemoryStats } from '../types';
import { formatBytes } from '../utils/crypto';

interface LeftColumnProps {
  stats: EdgeMemoryStats;
  messages: Message[];
  nodeLoads: {
    photonic: number;
    immersion: number;
  };
  onClearCache: () => void;
}

export const LeftColumn: React.FC<LeftColumnProps> = ({
  stats,
  messages,
  nodeLoads,
  onClearCache,
}) => {
  const [inspectorView, setInspectorView] = useState<'encrypted' | 'decrypted' | 'keys'>('decrypted');
  const [copied, setCopied] = useState(false);

  // Generate payload for inspector view
  let inspectorContent = '';
  if (inspectorView === 'encrypted') {
    inspectorContent = JSON.stringify(
      {
        storageKey: 'neurocloud.v1.messages',
        cipher: stats.cipherLabel,
        format: 'enc:<12-byte IV>.<AES-256-GCM-Ciphertext>',
        byteLength: stats.rawLength,
        rawPayload: stats.rawPayloadPreview || '(Empty - send a prompt to encrypt first turn)',
      },
      null,
      2
    );
  } else if (inspectorView === 'decrypted') {
    inspectorContent = JSON.stringify(
      {
        vaultStatus: 'LOCALLY_DECRYPTED_IN_MEMORY_ONLY',
        centralDatabaseWrites: '0 KB',
        turnsCached: stats.turnsCached,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          timestamp: m.ts,
          node: m.node_label || 'Auto-Routed',
          water_saved_liters: m.water_saved_l ?? 0,
          preview: m.content.length > 70 ? `${m.content.slice(0, 70)}...` : m.content,
        })),
      },
      null,
      2
    );
  } else {
    inspectorContent = JSON.stringify(
      {
        localStorageKeys: {
          'neurocloud.v1.messages': stats.rawPayloadPreview ? `${stats.rawLength} bytes [AES-GCM]` : 'null',
          'neurocloud.v1.saved_bytes': `${stats.savedBytes} bytes`,
          'neurocloud.v1.telemetry': 'Active session ledger',
        },
        cryptographicKeyJWK: stats.jwkExport ? JSON.parse(stats.jwkExport) : {},
      },
      null,
      2
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inspectorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Local Edge Storage Panel */}
      <div className="glass-panel p-4 flex flex-col flex-1 min-h-[380px] lg:min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <h2 className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Local Edge Storage</span>
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono font-medium text-emerald-300 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Active Vault
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mb-3">
          Zero-knowledge client memory: prompts never hit central DBs.
        </p>

        {/* 4 Storage Metric Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="glass-card rounded-xl p-2.5 border-emerald-500/30 bg-emerald-950/20">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
              Cloud DB writes
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </span>
            <div className="text-emerald-300 font-mono text-base font-bold tracking-tight mt-0.5">
              0 KB
            </div>
          </div>

          <div className="glass-card rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
              Encrypted Local
              <HardDrive className="w-3 h-3 text-cyan-400" />
            </span>
            <div className="text-cyan-300 font-mono text-base font-bold tracking-tight mt-0.5">
              {formatBytes(stats.localBytes)}
            </div>
          </div>

          <div className="glass-card rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Bypassed bytes
            </span>
            <div className="text-cyan-300 font-mono text-base font-bold tracking-tight mt-0.5">
              {formatBytes(stats.savedBytes)}
            </div>
          </div>

          <div className="glass-card rounded-xl p-2.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Algorithm
            </span>
            <div className="text-slate-200 font-mono text-xs font-semibold mt-0.5 truncate flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{stats.cipherLabel}</span>
            </div>
          </div>
        </div>

        {/* Inspector Tabs */}
        <div className="flex items-center justify-between gap-1 mb-1.5 border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInspectorView('decrypted')}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                inspectorView === 'decrypted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              Decrypted JSON
            </button>
            <button
              onClick={() => setInspectorView('encrypted')}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                inspectorView === 'encrypted'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3 h-3" />
              Raw Cipher
            </button>
            <button
              onClick={() => setInspectorView('keys')}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                inspectorView === 'keys'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3 h-3" />
              Keys
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-[11px] font-mono flex items-center gap-1"
            title="Copy Inspector JSON"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* JSON Inspector View */}
        <pre className="scroll-smooth-dark flex-1 min-h-[140px] max-h-[220px] overflow-auto rounded-xl bg-slate-950/90 border border-slate-800/80 p-2.5 text-[11px] leading-4 text-emerald-300/90 font-mono shadow-inner">
          {inspectorContent}
        </pre>

        {/* Clear Cache Button */}
        <button
          onClick={onClearCache}
          className="mt-3 w-full rounded-xl border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 text-xs font-mono py-2 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.1)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Local Edge Cache</span>
        </button>
      </div>

      {/* Node Topology Section */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Node Topology</span>
          </h2>
          <span className="text-[10px] font-mono text-cyan-400/80 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/40">
            2 / 3 Active
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* NeuroNode-Photonic-04 [Dry-Cooled] */}
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="pulse-dot cyan" />
                <span className="text-cyan-300 font-mono font-semibold text-xs">
                  NeuroNode-Photonic-04
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1 rounded">
                  Dry-Cooled
                </span>
              </div>
              <span className="font-mono text-cyan-300 font-bold">
                {Math.round(nodeLoads.photonic)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                style={{ width: `${Math.round(nodeLoads.photonic)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1 text-[10px] font-mono text-slate-400">
              <span>WUE: 0.00 L/kWh</span>
              <span>Optical Core • Active</span>
            </div>
          </div>

          {/* NeuroNode-Immersion-02 [Closed-Loop] */}
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="pulse-dot" />
                <span className="text-emerald-300 font-mono font-semibold text-xs">
                  NeuroNode-Immersion-02
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1 rounded">
                  Closed-Loop
                </span>
              </div>
              <span className="font-mono text-emerald-300 font-bold">
                {Math.round(nodeLoads.immersion)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                style={{ width: `${Math.round(nodeLoads.immersion)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1 text-[10px] font-mono text-slate-400">
              <span>WUE: 0.00 L/kWh</span>
              <span>Dielectric Fluid • Active</span>
            </div>
          </div>

          {/* Legacy-EvapCluster-01 [Bypassed] */}
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 opacity-70">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                <span className="text-slate-500 line-through font-mono text-xs">
                  Legacy-EvapCluster-01
                </span>
                <span className="text-[10px] font-mono text-rose-400/90 bg-rose-950/60 px-1 rounded border border-rose-800/40">
                  Bypassed
                </span>
              </div>
              <span className="font-mono text-slate-500 font-semibold">0%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full rounded-full bg-slate-700 w-0" />
            </div>
            <div className="flex justify-between items-center mt-1 text-[10px] font-mono text-slate-500">
              <span>Baseline: 1.8 L/kWh</span>
              <span className="text-rose-400/80">Evaporative Tower Locked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
