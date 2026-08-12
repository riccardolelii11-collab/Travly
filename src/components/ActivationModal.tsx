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
  LogIn,
  UserPlus,
  Mail,
} from 'lucide-react';
import { Language } from '../types';
import { verifyAndActivateCode, verifyLoginAccount } from '../utils/license';
import { pb } from '../utils/pocketbase';

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
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
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

    const cleanEmail = accountInput.trim();
    const cleanPass = passInput.trim();

    if (!cleanEmail) {
      setStatus({
        success: false,
        message: isIt
          ? 'Inserisci la tua Email / Nome Utente.'
          : 'Please enter your Email / Username.',
      });
      return;
    }

    if (!cleanPass) {
      setStatus({
        success: false,
        message: isIt
          ? 'Inserisci la Password.'
          : 'Please enter your Password.',
      });
      return;
    }

    if (mode === 'activate') {
      if (!confirmPassInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Ripeti la password nel campo di conferma.'
            : 'Please confirm your password.',
        });
        return;
      }

      if (cleanPass !== confirmPassInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Le password inserite non coincidono. Verifica e riprova.'
            : 'Passwords do not match. Please verify.',
        });
        return;
      }

      setLoading(true);
      setStatus(null);

      let pbSuccessNote = '';

      // 1. Create user in PocketBase "users" collection
      try {
        await pb.collection('users').create({
          email: cleanEmail,
          password: cleanPass,
          passwordConfirm: confirmPassInput.trim() || cleanPass,
          emailVisibility: true,
        });
        pbSuccessNote = isIt ? 'Utente creato su PocketBase!' : 'User created on PocketBase!';
      } catch (createErr: any) {
        console.warn('PocketBase creation notice:', createErr);
        const msg = createErr?.data?.message || createErr?.message || '';
        if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('already')) {
          pbSuccessNote = isIt ? 'Utente già esistente su PocketBase.' : 'User already exists on PocketBase.';
        }
      }

      // 2. Request email verification via pb.collection('users').requestVerification(email)
      try {
        await pb.collection('users').requestVerification(cleanEmail);
        pbSuccessNote += isIt
          ? ` Email di verifica inviata a ${cleanEmail}.`
          : ` Verification email sent to ${cleanEmail}.`;
      } catch (verifErr: any) {
        console.warn('PocketBase requestVerification notice:', verifErr);
      }

      // Perform activation logic
      const activeCode = code.trim() || 'TRV-FREE-2026';
      const result = await verifyAndActivateCode(activeCode, cleanEmail, cleanPass);

      setLoading(false);

      const finalMessage = pbSuccessNote
        ? `${pbSuccessNote} ${result.message}`
        : result.message;

      setStatus({
        success: true,
        message: finalMessage,
      });

      setTimeout(() => {
        onActivated(cleanEmail, cleanPass);
      }, 1200);

    } else {
      // mode === 'login' ("Accedi" tab)
      setLoading(true);
      setStatus(null);

      let pbLoginSuccess = false;
      let pbLoginMsg = '';

      // 3. Connect login via pb.collection('users').authWithPassword(email, password)
      try {
        const authData = await pb.collection('users').authWithPassword(cleanEmail, cleanPass);
        pbLoginSuccess = true;
        pbLoginMsg = isIt
          ? `Accesso PocketBase riuscito (${authData.record?.email || cleanEmail})!`
          : `PocketBase login successful (${authData.record?.email || cleanEmail})!`;
      } catch (pbErr: any) {
        console.warn('PocketBase authWithPassword error:', pbErr);
        const errMsg =
          pbErr?.data?.message ||
          pbErr?.message ||
          (isIt ? 'Credenziali non valide su PocketBase.' : 'Invalid PocketBase credentials.');

        // Verify fallback
        const fallbackRes = await verifyLoginAccount(cleanEmail, cleanPass);
        if (!fallbackRes.success) {
          setLoading(false);
          setStatus({
            success: false,
            message: `Errore Accesso PocketBase: ${errMsg}`,
          });
          return;
        }
      }

      const licRes = await verifyLoginAccount(cleanEmail, cleanPass);

      setLoading(false);

      setStatus({
        success: true,
        message: pbLoginSuccess ? `${pbLoginMsg} ${licRes.message}` : licRes.message,
      });

      setTimeout(() => {
        onActivated(cleanEmail, cleanPass);
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
              ? 'Registrati o accedi con il tuo account PocketBase per sincronizzare i tuoi viaggi.'
              : 'Register or log in with your PocketBase account to sync your trips.'}
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
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isIt ? 'Registrati' : 'Register'}</span>
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

            {/* Email / Account Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {isIt ? 'Email / Account' : 'Email / Account'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  placeholder={isIt ? 'es. nome@email.com' : 'e.g. name@email.com'}
                  className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                  autoFocus
                />
                <Mail className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                {isIt ? 'Password' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder={
                    mode === 'activate'
                      ? (isIt ? 'Crea una password (min. 8 caratteri)' : 'Create a password (min. 8 chars)')
                      : (isIt ? 'Inserisci la tua password' : 'Enter your password')
                  }
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

            {/* Confirm Password Input (Only on Registration Tab) */}
            {mode === 'activate' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                  {isIt ? 'Conferma Password' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder={isIt ? 'Ripeti la password' : 'Repeat password'}
                    className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-11 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                  />
                  <Lock className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Activation Code Input (Optional) */}
            {mode === 'activate' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--sub)] mb-1.5">
                  {isIt ? 'Codice di Attivazione (Opzionale)' : 'Activation Code (Optional)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="TRV-XXXX-XXXX-XXXX"
                    className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[12px] px-3.5 py-2.5 text-xs font-mono font-bold tracking-wider text-[var(--ink)] uppercase outline-none transition-all placeholder:text-[var(--sub)]/40"
                  />
                </div>
              </div>
            )}

            {/* PocketBase Info Banner */}
            <div className="space-y-2 pt-1">
              <div className="p-3 bg-[#12B5A5]/10 border border-[#12B5A5]/25 rounded-[12px] flex items-start gap-2.5 text-xs text-[var(--sub)] leading-relaxed">
                <Smartphone className="w-4 h-4 text-[#12B5A5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[var(--ink)] block mb-0.5">
                    {isIt ? '⚡ Autenticazione PocketBase' : '⚡ PocketBase Authentication'}
                  </strong>
                  {isIt
                    ? 'Connesso al server PocketBase (http://161.97.169.242:8090). Registrando il tuo account verrà creata una voce in "users" ed inviata l\'email di verifica.'
                    : 'Connected to PocketBase server (http://161.97.169.242:8090). Registering creates a record in "users" and sends a verification email.'}
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
                (mode === 'activate' && !confirmPassInput.trim())
              }
              className="w-full py-3.5 px-4 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-[14px] transition-all shadow-lg shadow-[#12B5A5]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isIt ? 'Elaborazione in corso...' : 'Processing...'}</span>
                </>
              ) : mode === 'activate' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isIt ? 'Registrati su PocketBase' : 'Register on PocketBase'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isIt ? 'Accedi con PocketBase' : 'Log In with PocketBase'}</span>
                </>
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div className="pt-2 border-t border-[var(--hair)] flex items-center justify-between text-[11px] text-[var(--sub)] font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#12B5A5]" />
              {isIt ? 'Server PocketBase: 161.97.169.242' : 'PocketBase Server: 161.97.169.242'}
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
