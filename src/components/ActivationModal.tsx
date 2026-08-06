import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Language } from '../types';
import { verifyAndActivateCode } from '../utils/license';

interface ActivationModalProps {
  isOpen: boolean;
  onActivated: () => void;
  lang: Language;
  accountName?: string;
  isOverlay?: boolean; // If true, acts as a full lock screen
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onActivated,
  lang,
  accountName,
  isOverlay = true,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const isIt = lang === 'it';

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setStatus({
        success: false,
        message: isIt ? 'Inserisci il tuo codice di attivazione.' : 'Please enter your activation code.',
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await verifyAndActivateCode(code, accountName);
    setLoading(false);
    setStatus(result);

    if (result.success) {
      setTimeout(() => {
        onActivated();
      }, 1000);
    }
  };

  return (
    <div
      className={`fixed inset-0 grid place-items-center z-[200] p-3 sm:p-4 overflow-y-auto ${
        isOverlay ? 'bg-[#0B172A]/90 backdrop-blur-md' : 'bg-[#0B172A]/60 backdrop-blur-xs'
      }`}
    >
      <div className="bg-[var(--card)] border border-[var(--line)] w-full max-w-lg rounded-[22px] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0F2847] to-[#16365C] p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-[#12B5A5]/20 border border-[#12B5A5]/40 rounded-2xl mx-auto grid place-items-center mb-3 text-[#12B5A5] shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {isIt ? 'Sblocca Travly' : 'Unlock Travly'}
          </h2>
          <p className="text-xs text-[#9FB1CE] mt-1 max-w-sm mx-auto leading-relaxed">
            {isIt
              ? 'Inserisci il codice di licenza acquistato per sbloccare tutte le funzionalità di Travly sul tuo dispositivo.'
              : 'Enter your purchased license key to unlock all features of Travly on your device.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {isIt ? 'Codice di Attivazione' : 'Activation Code'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TRV-XXXX-XXXX-XXXX"
                  className="w-full bg-[var(--soft)] border-2 border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] px-4 py-3.5 text-center text-base sm:text-lg font-mono font-bold tracking-widest text-[var(--ink)] uppercase outline-none transition-all placeholder:text-[var(--sub)]/40 shadow-inner"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-[var(--sub)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {status && (
              <div
                className={`p-3.5 rounded-[12px] text-xs font-semibold flex items-start gap-2.5 ${
                  status.success
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                }`}
              >
                {status.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 px-4 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-[14px] transition-all shadow-lg shadow-[#12B5A5]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isIt ? 'Verifica in corso...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isIt ? 'Attiva e Inizia' : 'Activate & Continue'}</span>
                </>
              )}
            </button>
          </form>
          {/* Master / Offline hint info */}
          <div className="pt-2 border-t border-[var(--hair)] flex items-center justify-between text-[11px] text-[var(--sub)] font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#12B5A5]" />
              {isIt ? 'Licenza personale e sicura' : 'Personal & secure license'}
            </span>
            <span className="text-[10px] text-[var(--sub)]/70">
              Travly v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
