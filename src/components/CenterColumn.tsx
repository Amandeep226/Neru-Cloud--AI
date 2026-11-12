import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Cpu,
  Droplets,
  Flame,
  Clock,
  Shield,
  Layers,
  Bot,
  User,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Message } from '../types';

interface CenterColumnProps {
  messages: Message[];
  isBusy: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onRunWorkload: (name: string, gpus: number, hours: number) => Promise<void>;
  onOpenCustomWorkload: () => void;
}

export const CenterColumn: React.FC<CenterColumnProps> = ({
  messages,
  isBusy,
  onSendMessage,
  onRunWorkload,
  onOpenCustomWorkload,
}) => {
  const [inputText, setInputText] = useState('');
  const chatLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTo({
        top: chatLogRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isBusy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isBusy) return;
    const msg = inputText.trim();
    setInputText('');
    onSendMessage(msg);
  };

  const testPills = [
    {
      label: 'How does zero-water inference work?',
      prompt: 'How does zero-water inference work?',
      kind: 'quick',
    },
    {
      label: 'Where is my chat history stored?',
      prompt: 'Where is my chat history stored?',
      kind: 'quick',
    },
    {
      label: 'Explain thermal delta',
      prompt: 'Explain thermal delta prediction and how it prevents cooling overshoot.',
      kind: 'quick',
    },
    {
      label: 'Workload: Fine-tune 7B (8 GPU, 12 h)',
      workload: { name: 'Fine-tune 7B Model', gpus: 8, hours: 12 },
      kind: 'workload',
    },
    {
      label: 'Workload: Train 70B (256 GPU, 72 h)',
      workload: { name: 'Train 70B Foundation Model', gpus: 256, hours: 72 },
      kind: 'workload',
    },
  ];

  return (
    <div className="glass-panel flex flex-col min-h-[500px] lg:min-h-0 h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>NeuroCloud AI Chat</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-normal">
                0-Water Path
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              History is stored in this browser only (AES-256-GCM)
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCustomWorkload}
          className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline px-2 py-1 rounded bg-slate-900 border border-slate-800"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Custom Spec</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatLogRef}
        className="scroll-smooth-dark flex-1 min-h-0 overflow-y-auto py-3 space-y-3.5 pr-1.5"
      >
        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-cyan-950/80 to-cyan-900/70 border border-cyan-500/40 p-3 text-slate-100 text-sm shadow-[0_4px_16px_rgba(8,145,178,0.2)]">
                  <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-mono text-cyan-300/80">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> Client Prompt
                    </span>
                    <span>{new Date(m.ts).toLocaleTimeString([], { hour12: false })}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            );
          }

          if (m.role === 'system') {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="max-w-[95%] w-full rounded-xl bg-slate-900/80 border border-emerald-500/30 p-3 text-emerald-200 text-xs shadow-[0_4px_16px_rgba(16,185,129,0.12)]">
                  <div className="flex items-center justify-between gap-2 mb-1.5 font-mono text-[10px] text-emerald-400">
                    <span className="flex items-center gap-1 font-semibold uppercase">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Cluster Workload Orchestration Receipt
                    </span>
                    <span>{new Date(m.ts).toLocaleTimeString([], { hour12: false })}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words leading-relaxed text-slate-200 text-xs">
                    {m.content}
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-emerald-300/80">
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-emerald-400" />
                      WUE: 0.00 L/kWh (Evaporative Bypassed)
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      0 bytes written to Cloud DB
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // AI Message
          return (
            <div key={m.id} className="flex flex-col items-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-slate-900/90 border border-slate-700/80 p-3.5 text-slate-200 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-800 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    NeuroCloud AI
                  </span>
                  <span className="text-slate-400">
                    {new Date(m.ts).toLocaleTimeString([], { hour12: false })}
                  </span>
                </div>

                <div className="whitespace-pre-wrap break-words leading-relaxed text-slate-100">
                  {m.content}
                </div>

                {/* Telemetry pill metadata bar */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" />
                      {m.node_label || 'NeuroNode-Photonic-04'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {m.latency_ms ?? 42} ms
                    </span>
                    {m.water_saved_l !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                        <Droplets className="w-2.5 h-2.5 text-emerald-400" />
                        +{m.water_saved_l.toFixed(5)} L saved
                      </span>
                    )}
                    {m.delta_t_c !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50 flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        +{m.delta_t_c.toFixed(2)} °C
                      </span>
                    )}
                  </div>

                  <span className="text-emerald-400/90 text-[10px] flex items-center gap-1 ml-auto">
                    <Shield className="w-3 h-3" />
                    Vault Saved (0 Cloud DB Writes)
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isBusy && (
          <div className="flex items-center gap-2 max-w-[120px] rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-slate-300">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="text-[10px] font-mono text-cyan-400 ml-1">Routing...</span>
          </div>
        )}
      </div>

      {/* 5 One-Click Test Pills */}
      <div className="mt-2 pt-2 border-t border-slate-800/60 shrink-0">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>One-Click Test Workloads & Queries</span>
          <span className="text-slate-500">Autonomous Telemetry Verification</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {testPills.map((pill, idx) => {
            if (pill.kind === 'quick') {
              return (
                <button
                  key={idx}
                  onClick={() => onSendMessage(pill.prompt!)}
                  disabled={isBusy}
                  className="rounded-full border border-cyan-500/40 text-cyan-200 hover:text-white hover:bg-cyan-500/20 px-2.5 py-1 text-xs font-mono transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{pill.label}</span>
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() =>
                  onRunWorkload(
                    pill.workload!.name,
                    pill.workload!.gpus,
                    pill.workload!.hours
                  )
                }
                disabled={isBusy}
                className="rounded-full border border-emerald-500/40 text-emerald-200 hover:text-white hover:bg-emerald-500/20 px-2.5 py-1 text-xs font-mono transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message NeuroCloud AI (e.g. 'How does zero-water inference work?')..."
            maxLength={2000}
            disabled={isBusy}
            className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all disabled:opacity-50"
          />
          <div className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-500">
            {inputText.length > 0 && `${inputText.length}/2000`}
          </div>
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isBusy}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Dispatch</span>
        </button>
      </form>
    </div>
  );
};
