import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Smartphone,
} from 'lucide-react';
import { Language } from '../types';
import { verifyAndActivateCode } from '../utils/license';

interface ActivationModalProps {
  isOpen: boolean;
  onActivated: (accountName?: string) => void;
  lang: Language;
  accountName?: string;
  isOverlay?: boolean; // If true, acts as a full lock screen
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onActivated,
  lang,
  accountName = '',
  isOverlay = true,
}) => {
  const [code, setCode] = useState('');
  const [accountInput, setAccountInput] = useState(accountName);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (accountName) {
      setAccountInput(accountName);
    }
  }, [accountName]);

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

    if (!accountInput.trim()) {
      setStatus({
        success: false,
        message: isIt
          ? 'Inserisci un Nome Account Travly per associare la tua licenza e consentire l\'uso su altri dispositivi.'
          : 'Please enter a Travly Account Name to bind your license for multi-device access.',
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await verifyAndActivateCode(code, accountInput.trim());
    setLoading(false);
    setStatus(result);

    if (result.success) {
      setTimeout(() => {
        onActivated(accountInput.trim());
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
            {isIt ? 'Attiva & Sblocca Travly' : 'Activate & Unlock Travly'}
          </h2>
          <p className="text-xs text-[#9FB1CE] mt-1 max-w-sm mx-auto leading-relaxed">
            {isIt
              ? 'Inserisci il tuo codice di licenza e il tuo Account Travly per sbloccare l\'applicazione su tutti i tuoi dispositivi.'
              : 'Enter your license key and Travly Account to unlock the app on all your devices.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <form onSubmit={handleActivate} className="space-y-4">
            {/* Activation Code Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {isIt ? '1. Codice di Attivazione' : '1. Activation Code'}
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

            {/* Account Name Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {isIt ? '2. Nome Account Travly (Email o Nome Utente)' : '2. Travly Account Name (Email or Username)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  placeholder={isIt ? 'es. mario.rossi o mario@gmail.com' : 'e.g. john.doe or john@gmail.com'}
                  className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                />
                <User className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Explanatory Banner for Multi-Device */}
            <div className="p-3 bg-[#12B5A5]/10 border border-[#12B5A5]/25 rounded-[12px] flex items-start gap-2.5 text-xs text-[var(--sub)] leading-relaxed">
              <Smartphone className="w-4 h-4 text-[#12B5A5] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--ink)] block mb-0.5">
                  {isIt ? '💡 Cambio Dispositivo Senza Riacquisto' : '💡 Multi-Device Activation'}
                </strong>
                {isIt
                  ? 'Associando il codice al tuo Account Travly, potrai sbloccare l\'app su un nuovo smartphone o computer usando lo stesso codice e account!'
                  : 'By associating your code with your Travly Account, you can restore access on new devices without buying again!'}
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
              disabled={loading || !code.trim() || !accountInput.trim()}
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
                  <span>{isIt ? 'Attiva e Associa Account' : 'Activate & Link Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Security Footer */}
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

