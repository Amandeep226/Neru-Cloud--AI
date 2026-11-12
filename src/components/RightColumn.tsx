import React, { useRef, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Droplets,
  Flame,
  Award,
  Download,
  Terminal,
  Activity,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Info,
  Pause,
  Play
} from 'lucide-react';
import { TelemetryState } from '../types';
import { getCertificateData, exportCertificateProofFile } from '../utils/telemetry';
import { formatBytes } from '../utils/crypto';

interface RightColumnProps {
  telemetry: TelemetryState;
  onClearLogs?: () => void;
}

export const RightColumn: React.FC<RightColumnProps> = ({
  telemetry,
  onClearLogs,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const cert = getCertificateData(telemetry);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [telemetry.logs, autoScroll]);

  const handleExport = () => {
    exportCertificateProofFile(telemetry);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Real-time KPI Cards */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Water & Thermal Telemetry</span>
          </h2>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="pulse-dot" />
            Live Feed
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Cloud DB Writes */}
          <div className="glass-card rounded-xl p-3 border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Cloud DB Writes</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-emerald-300 font-mono text-2xl font-bold tracking-tight mt-1 flex items-baseline gap-1">
              <span>{telemetry.writes}</span>
              <span className="text-xs font-normal text-emerald-400/80">blocked</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              {formatBytes(telemetry.bypassed)} kept local
            </div>
          </div>

          {/* Freshwater Saved (L) */}
          <div className="glass-card rounded-xl p-3 border-cyan-500/30 bg-cyan-950/20">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Freshwater Saved</span>
              <Droplets className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-cyan-300 font-mono text-2xl font-bold tracking-tight mt-1 flex items-baseline gap-1 truncate">
              <span>{telemetry.water.toFixed(4)}</span>
              <span className="text-xs font-normal text-cyan-400/80">L</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              vs. 1.8 L/kWh baseline
            </div>
          </div>

          {/* Thermal Delta ΔT */}
          <div className="glass-card rounded-xl p-3 border-amber-500/30 bg-amber-950/20">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Thermal Delta ΔT</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-amber-300 font-mono text-xl font-bold tracking-tight mt-1">
              {telemetry.dtLast > 0 ? `+${telemetry.dtLast.toFixed(2)} °C` : '+0.00 °C'}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              Peak: +{telemetry.dtMax.toFixed(2)} °C
            </div>
          </div>

          {/* Routed WUE */}
          <div className="glass-card rounded-xl p-3 border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Routed WUE</span>
              <Award className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-emerald-300 font-mono text-xl font-bold tracking-tight mt-1">
              0.00 <span className="text-xs font-normal text-emerald-400/80">L/kWh</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-400/80 mt-1">
              Zero Evaporative Water
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling Routing Audit Log */}
      <div className="glass-panel p-4 flex flex-col flex-1 min-h-[160px] max-h-[260px] lg:max-h-none">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Routing Audit Log
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
              title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            >
              {autoScroll ? (
                <>
                  <Pause className="w-2.5 h-2.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5" /> Auto
                </>
              )}
            </button>
            <span className="text-[10px] font-mono text-slate-500">
              {telemetry.logs.length} entries
            </span>
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="scroll-smooth-dark flex-1 overflow-y-auto font-mono text-[11px] leading-5 text-slate-300 space-y-1 bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 shadow-inner"
        >
          {telemetry.logs.map((logLine, index) => {
            const isEvapBypass = logLine.includes('Legacy-EvapCluster-01') || logLine.includes('bypassed');
            const isThermal = logLine.includes('Thermal model');
            const isBlocked = logLine.includes('blocked') || logLine.includes('0 bytes');
            const isRouted = logLine.includes('Routed') || logLine.includes('Dispatched');

            let colorClass = 'text-slate-300';
            if (isEvapBypass) colorClass = 'text-cyan-300 font-medium';
            else if (isBlocked) colorClass = 'text-emerald-400 font-medium';
            else if (isThermal) colorClass = 'text-amber-300';
            else if (isRouted) colorClass = 'text-emerald-300';

            return (
              <div key={index} className={`break-words ${colorClass}`}>
                {logLine}
              </div>
            );
          })}
        </div>
      </div>

      {/* ISO-14046 ESG Compliance Certificate */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider">
              ISO-14046 ESG Certificate
            </h2>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
            Water Footprint
          </span>
        </div>

        <dl className="text-xs space-y-1.5 mb-3 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/70">
          <div className="flex justify-between items-center">
            <dt className="text-slate-400 font-mono text-[11px]">Certificate ID</dt>
            <dd className="font-mono text-cyan-300 font-semibold text-[11px]">
              {cert.id}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-slate-400 font-mono text-[11px]">Integrity Hash</dt>
            <dd className="font-mono text-slate-300 text-[10px] truncate max-w-[170px]" title={cert.fingerprint}>
              0x{cert.fingerprint.slice(0, 16)}...
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-slate-400 font-mono text-[11px]">Requests Covered</dt>
            <dd className="font-mono text-white font-bold">{telemetry.requests}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-slate-400 font-mono text-[11px]">Freshwater Saved</dt>
            <dd className="font-mono text-emerald-300 font-bold">
              {telemetry.water.toFixed(4)} L
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-slate-400 font-mono text-[11px]">Avg / Max ΔT</dt>
            <dd className="font-mono text-amber-300 font-medium">
              +{cert.avgDt.toFixed(2)} / +{cert.maxDt.toFixed(2)} °C
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-slate-400 font-mono text-[11px]">DB Writes Bypassed</dt>
            <dd className="font-mono text-cyan-300 font-medium">
              {formatBytes(telemetry.bypassed)}
            </dd>
          </div>
        </dl>

        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed flex items-start gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Self-generated prototype audit record with deterministic proof hash; not a third-party audit.
          </span>
        </p>

        {/* Working Export Proof (.txt) button */}
        <button
          onClick={handleExport}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm py-2.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer"
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Proof Exported Successfully!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-slate-950" />
              <span>Export Proof (.txt)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
