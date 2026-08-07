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
  Eye,
  EyeOff,
  Clock,
  LogIn,
} from 'lucide-react';
import { Language } from '../types';
import { verifyAndActivateCode, verifyLoginAccount } from '../utils/license';

interface ActivationModalProps {
  isOpen: boolean;
  onActivated: (accountName?: string, password?: string) => void;
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
  const [mode, setMode] = useState<'activate' | 'login'>('activate');
  const [code, setCode] = useState('');
  const [accountInput, setAccountInput] = useState(accountName);
  const [passInput, setPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (accountName) {
      setAccountInput(accountName);
    }
  }, [accountName]);

  if (!isOpen) return null;

  const isIt = lang === 'it';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!accountInput.trim()) {
      setStatus({
        success: false,
        message: isIt
          ? 'Inserisci il Nome Account Travly (Email o Nome Utente).'
          : 'Please enter your Travly Account Name.',
      });
      return;
    }

    if (!passInput.trim()) {
      setStatus({
        success: false,
        message: isIt
          ? 'Inserisci la Password del tuo Account per proteggere la tua licenza.'
          : 'Please enter your Account Password.',
      });
      return;
    }

    if (mode === 'activate' && !code.trim()) {
      setStatus({
        success: false,
        message: isIt
          ? 'Inserisci il tuo Codice di Attivazione (es. TRV-XXXX-XXXX-XXXX).'
          : 'Please enter your Activation Code.',
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    let result: { success: boolean; message: string; code?: string };

    if (mode === 'login') {
      result = await verifyLoginAccount(accountInput.trim(), passInput.trim(), code.trim());
    } else {
      result = await verifyAndActivateCode(code.trim(), accountInput.trim(), passInput.trim());
    }

    setLoading(false);
    setStatus(result);

    if (result.success) {
      setTimeout(() => {
        onActivated(accountInput.trim(), passInput.trim());
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
            {isIt ? 'Benvenuto su Travly' : 'Welcome to Travly'}
          </h2>
          <p className="text-xs text-[#9FB1CE] mt-1 max-w-sm mx-auto leading-relaxed">
            {isIt
              ? 'Attiva un nuovo codice o accedi al tuo account per sbloccare l\'applicazione.'
              : 'Activate a code or log in to unlock the application.'}
          </p>

          {/* Tab Selection Switcher */}
          <div className="flex bg-[#0B172A]/60 border border-white/10 rounded-xl p-1 mt-4 max-w-xs mx-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('activate');
                setStatus(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'activate'
                  ? 'bg-[#12B5A5] text-white shadow-md'
                  : 'text-[#9FB1CE] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isIt ? 'Attiva Codice' : 'Activate Code'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setStatus(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#12B5A5] text-white shadow-md'
                  : 'text-[#9FB1CE] hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isIt ? 'Accedi' : 'Log In'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Activation Code Input (Required in Activate mode, optional in Login mode) */}
            {mode === 'activate' && (
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
            )}

            {/* Account Name Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {mode === 'activate'
                  ? isIt ? '2. Nome Account Travly (Email o Nome Utente)' : '2. Travly Account Name (Email or Username)'
                  : isIt ? '1. Nome Account Travly' : '1. Travly Account Name'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  placeholder={isIt ? 'es. mario.rossi o mario@gmail.com' : 'e.g. john.doe or john@gmail.com'}
                  className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                  autoFocus={mode === 'login'}
                />
                <User className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {mode === 'activate'
                  ? isIt ? '3. Password Account Travly' : '3. Travly Account Password'
                  : isIt ? '2. Password Account' : '2. Account Password'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder={isIt ? 'Inserisci la tua password' : 'Enter your password'}
                  className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-11 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                />
                <Lock className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Optional Code in Login Mode if user wants to enter it */}
            {mode === 'login' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] mb-1.5">
                  {isIt ? 'Codice di Attivazione (Opzionale)' : 'Activation Code (Optional)'}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TRV-XXXX-XXXX-XXXX"
                  className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[12px] px-3.5 py-2 text-xs font-mono font-bold tracking-wider text-[var(--ink)] uppercase outline-none transition-all placeholder:text-[var(--sub)]/40"
                />
              </div>
            )}

            {/* Explanatory Banners */}
            <div className="space-y-2 pt-1">
              <div className="p-3 bg-[#12B5A5]/10 border border-[#12B5A5]/25 rounded-[12px] flex items-start gap-2.5 text-xs text-[var(--sub)] leading-relaxed">
                <Smartphone className="w-4 h-4 text-[#12B5A5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[var(--ink)] block mb-0.5">
                    {isIt ? '💡 Cambio Dispositivo & Multi-Accesso' : '💡 Multi-Device Access'}
                  </strong>
                  {isIt
                    ? 'Puoi accedere con il tuo Account e Password su qualsiasi smartphone o computer per continuare a usare la tua licenza!'
                    : 'Log in with your Account & Password on any device to use your license!'}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-[12px] flex items-start gap-2.5 text-xs text-[var(--sub)] leading-relaxed">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[var(--ink)] block mb-0.5">
                    {isIt ? '⏳ Conservazione 15 Giorni in Caso di Eliminazione' : '⏳ 15-Day Recovery Grace Period'}
                  </strong>
                  {isIt
                    ? 'In caso di eliminazione account, il tuo codice rimane salvato e recuperabile per 15 giorni. Trascorsi 15 giorni viene disattivato definitivamente.'
                    : 'If an account is deleted, your license remains saved for 15 days to recover. After 15 days, it is permanently deactivated.'}
                </div>
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
              disabled={
                loading ||
                !accountInput.trim() ||
                !passInput.trim() ||
                (mode === 'activate' && !code.trim())
              }
              className="w-full py-3.5 px-4 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-[14px] transition-all shadow-lg shadow-[#12B5A5]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isIt ? 'Verifica in corso...' : 'Verifying...'}</span>
                </>
              ) : mode === 'activate' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isIt ? 'Attiva e Crea Account' : 'Activate & Create Account'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isIt ? 'Accedi e Sblocca' : 'Log In & Unlock'}</span>
                </>
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div className="pt-2 border-t border-[var(--hair)] flex items-center justify-between text-[11px] text-[var(--sub)] font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#12B5A5]" />
              {isIt ? 'Licenza personale e protetta' : 'Personal & secure license'}
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


