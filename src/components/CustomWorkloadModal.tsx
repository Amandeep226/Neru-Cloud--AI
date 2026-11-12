import React, { useState } from 'react';
import { X, SlidersHorizontal, Cpu, Zap, Droplets, Flame, Check, Shield } from 'lucide-react';
import { WUE_EVAP_BASELINE } from '../utils/telemetry';

interface CustomWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatch: (name: string, gpus: number, hours: number) => Promise<void>;
  isBusy: boolean;
}

export const CustomWorkloadModal: React.FC<CustomWorkloadModalProps> = ({
  isOpen,
  onClose,
  onDispatch,
  isBusy,
}) => {
  const [name, setName] = useState('DeepSeek-V3 MoE Pretraining');
  const [gpus, setGpus] = useState(128);
  const [hours, setHours] = useState(24);

  if (!isOpen) return null;

  const powerKw = Number((gpus * 0.7).toFixed(2));
  const energyKwh = Number((powerKw * hours).toFixed(2));
  const waterSavedL = Number((energyKwh * WUE_EVAP_BASELINE).toFixed(2));
  const deltaT = Number((6 + gpus * 0.05).toFixed(1));
  const targetNode = gpus >= 64 ? 'NeuroNode-Immersion-02 [Closed-Loop]' : 'NeuroNode-Photonic-04 [Dry-Cooled]';

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    await onDispatch(name, gpus, hours);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Cluster Workload Spec Simulator
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Profile large-scale GPU workloads and predict zero-water routing
            </p>
          </div>
        </div>

        <form onSubmit={handleRun} className="space-y-4">
          {/* Workload Name */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Workload Identifier
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
              required
            />
          </div>

          {/* GPU Count */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400 uppercase">GPU Allocations:</span>
              <span className="text-cyan-300 font-bold">{gpus} Tensor Accelerators</span>
            </div>
            <input
              type="range"
              min="1"
              max="512"
              step="1"
              value={gpus}
              onChange={(e) => setGpus(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
              <span>1 GPU (Dry Photonic)</span>
              <span>64 GPUs (Immersion Threshold)</span>
              <span>512 GPUs (Dense Immersion)</span>
            </div>
          </div>

          {/* Compute Duration */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400 uppercase">Duration:</span>
              <span className="text-emerald-300 font-bold">{hours} Hours</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="168"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
              <span>30 Mins</span>
              <span>24 Hours (1 Day)</span>
              <span>168 Hours (1 Week)</span>
            </div>
          </div>

          {/* Modelled Telemetry Preview Card */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2 text-xs font-mono">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulated Execution Metrics</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Total Energy</span>
                <span className="text-sm font-bold text-white">
                  {energyKwh.toLocaleString()} kWh
                </span>
              </div>

              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Freshwater Saved</span>
                <span className="text-sm font-bold text-cyan-300">
                  {waterSavedL.toLocaleString()} Liters
                </span>
              </div>

              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Predicted Thermal Spike</span>
                <span className="text-sm font-bold text-amber-300">
                  +{deltaT} °C
                </span>
              </div>

              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Target Node</span>
                <span className="text-[11px] font-bold text-emerald-300 truncate block">
                  {gpus >= 64 ? 'Immersion-02' : 'Photonic-04'}
                </span>
              </div>
            </div>

            <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>WUE: 0.00 L/kWh (Zero-water path)</span>
              <span>Legacy evaporative: 100% bypassed</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono py-2.5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono py-2.5 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
            >
              {isBusy ? 'Dispatching...' : 'Dispatch to Cluster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
