import React from 'react';
import { Cpu, Droplets, Shield, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface HeaderProps {
  backendOnline: boolean;
  hasLlm: boolean;
  sessionId: string;
  onOpenWorkloadModal: () => void;
  onResetSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  hasLlm,
  sessionId,
  onOpenWorkloadModal,
  onResetSession,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 py-3 shrink-0 z-30 sticky top-0">
      <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
            <Cpu className="w-5 h-5 text-cyan-300" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>NeuroCloud AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase font-medium">
                  v1.4 Orchestrator
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
              <span>Autonomous Zero-Water Compute</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400/90 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                AES-256 Edge Memory
              </span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* WUE Metric Banner */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <Droplets className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Routed WUE:</span>
            <span className="font-bold text-emerald-200">0.00 L/kWh</span>
          </div>

          {/* Model / Engine Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
            <span
              className={`pulse-dot ${
                backendOnline ? (hasLlm ? '' : 'cyan') : 'cyan'
              }`}
            />
            <span className="hidden md:inline text-slate-400">Engine:</span>
            <span className="font-semibold text-white flex items-center gap-1">
              {backendOnline ? (
                hasLlm ? (
                  <>
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Gemini 2.5 Flash
                  </>
                ) : (
                  'Deterministic Backend'
                )
              ) : (
                'Edge Autonomous'
              )}
            </span>
          </div>

          {/* Session ID */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono text-slate-400">
            <span>Session:</span>
            <span className="text-slate-200 font-semibold">{sessionId}</span>
          </div>

          {/* Custom Workload Button */}
          <button
            onClick={onOpenWorkloadModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 border border-cyan-700/50 hover:border-cyan-500 transition-all text-xs font-mono font-medium"
            title="Configure custom GPU cluster workloads"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Cluster Sim</span>
          </button>

          {/* Reset Session Button */}
          <button
            onClick={onResetSession}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all"
            title="Reset telemetry & start fresh session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
