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
  Mail,
  HelpCircle,
  ArrowLeft,
  Send,
  Check,
} from 'lucide-react';
import { Language } from '../types';
import { verifyAndActivateCode, setAppActivated } from '../utils/license';
import { saveStoredUserAccount } from '../utils/supabase';
import { pb, extractResetToken, TRAVLY_SUPPORT_EMAIL, TRAVLY_SUPPORT_SENDER_NAME } from '../lib/pocketbase';

export function formatPocketBaseError(error: any): string {
  if (!error) return 'Errore sconosciuto PocketBase';

  // 1. Check for field-level validation errors in error.data.data or error.response.data.data
  const dataObj = error?.data?.data || error?.response?.data?.data;
  if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
    const details = Object.entries(dataObj)
      .map(([field, errObj]: [string, any]) => {
        const fieldName =
          field === 'password'
            ? 'Password'
            : field === 'email'
            ? 'Email'
            : field === 'passwordConfirm'
            ? 'Conferma Password'
            : field;
        const msg =
          errObj?.message || (typeof errObj === 'string' ? errObj : JSON.stringify(errObj));
        return `${fieldName}: ${msg}`;
      })
      .filter(Boolean)
      .join('\n');

    if (details) {
      return details;
    }
  }

  // 2. Top-level message in error.data.message
  if (error?.data?.message) {
    return error.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Errore PocketBase durante l\'operazione';
}

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
  const [viewMode, setViewMode] = useState<'form' | 'forgot_password' | 'reset_password'>('form');
  const [mode, setMode] = useState<'activate' | 'login'>('activate');
  const [code, setCode] = useState('');
  const [accountInput, setAccountInput] = useState(accountName);
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // States for forgot password screen
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // States for confirm reset password screen (coming from email link)
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
  const [resetConfirmLoading, setResetConfirmLoading] = useState(false);
  const [resetConfirmStatus, setResetConfirmStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (accountName) {
      setAccountInput(accountName);
    }
  }, [accountName]);

  // Check URL token for password reset
  useEffect(() => {
    const checkResetToken = () => {
      const token = extractResetToken();
      if (token) {
        setResetToken(token);
        setViewMode('reset_password');
        setResetConfirmStatus(null);
      }
    };

    checkResetToken();
    window.addEventListener('popstate', checkResetToken);
    window.addEventListener('hashchange', checkResetToken);

    return () => {
      window.removeEventListener('popstate', checkResetToken);
      window.removeEventListener('hashchange', checkResetToken);
    };
  }, []);

  if (!isOpen) return null;

  const isIt = lang === 'it';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (mode === 'activate') {
      if (!code.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Inserisci il tuo Codice di Attivazione (es. TRV-XXXX-XXXX-XXXX).'
            : 'Please enter your Activation Code.',
        });
        return;
      }

      if (!accountInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Inserisci il Nome Account Travly (Username).'
            : 'Please enter your Travly Account Name (Username).',
        });
        return;
      }

      if (!emailInput.trim() || !emailInput.includes('@')) {
        setStatus({
          success: false,
          message: isIt
            ? 'Inserisci un indirizzo email valido (es. mario.rossi@gmail.com).'
            : 'Please enter a valid email address.',
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

      if (!confirmPassInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Ripeti la password nel campo di conferma.'
            : 'Please confirm your password.',
        });
        return;
      }

      if (passInput.trim() !== confirmPassInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Le password inserite non coincidono. Verifica e riprova.'
            : 'Passwords do not match. Please verify.',
        });
        return;
      }
    } else {
      if (!accountInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Inserisci il Nome Account Travly o Email.'
            : 'Please enter your Travly Account Name or Email.',
        });
        return;
      }

      if (!passInput.trim()) {
        setStatus({
          success: false,
          message: isIt
            ? 'Inserisci la Password del tuo Account.'
            : 'Please enter your Account Password.',
        });
        return;
      }
    }

    setLoading(true);
    setStatus(null);

    if (mode === 'login') {
      const identity = accountInput.trim();
      const password = passInput.trim();
      let authData: any = null;
      let loggedUser = identity;

      try {
        if (identity.includes('@')) {
          // 3. Email diretta su PocketBase
          authData = await pb.collection('users').authWithPassword(identity, password);
          console.log('Login effettuato con successo via email diretta su PocketBase:', identity);
        } else {
          // 2. Nome Utente (senza '@'): cerca il record direttamente su PocketBase
          try {
            const userRecord = await pb.collection('users').getFirstListItem(
              `username = "${identity}" || name = "${identity}"`
            );
            if (userRecord && userRecord.email) {
              authData = await pb.collection('users').authWithPassword(userRecord.email, password);
              console.log('Login effettuato con successo via email recuperata da record PocketBase:', userRecord.email);
            } else {
              authData = await pb.collection('users').authWithPassword(identity, password);
              console.log('Login effettuato con successo via username diretto su PocketBase:', identity);
            }
          } catch (findErr) {
            console.log('Ricerca record per username/name fallita, tentativo auth diretta username:', findErr);
            authData = await pb.collection('users').authWithPassword(identity, password);
            console.log('Login effettuato con successo via username diretto su PocketBase:', identity);
          }
        }

        if (authData && authData.record) {
          setAppActivated(authData.record?.id || 'TRV-POCKETBASE');
          loggedUser = authData.record?.name || authData.record?.username || authData.record?.email || identity;
          saveStoredUserAccount(loggedUser, password);

          setStatus({
            success: true,
            message: isIt
              ? 'Accesso eseguito con successo! Benvenuto in Travly.'
              : 'Login successful! Welcome to Travly.',
          });

          setTimeout(() => {
            setLoading(false);
            onActivated(loggedUser, password);
          }, 500);
          return;
        } else {
          throw new Error('Nessun record PocketBase');
        }
      } catch (authError: any) {
        console.error('PocketBase auth error:', authError);
        setLoading(false);
        setStatus({
          success: false,
          message: isIt
            ? 'Nome account/Email o Password non validi.'
            : 'Invalid Account Name/Email or Password.',
        });
        return;
      }
    }

    // mode === 'activate'
    const result = await verifyAndActivateCode(code.trim(), accountInput.trim(), passInput.trim());

    if (result.success) {
      const email = emailInput.trim();
      const password = passInput.trim();
      const rawUsername = accountInput.trim();
      const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Create on PocketBase (non-blocking if already created)
      try {
        await pb.collection('users').create({
          email: email,
          password: password,
          passwordConfirm: password,
          username: cleanUsername,
          name: rawUsername,
          emailVisibility: true,
        });
      } catch (createErr) {
        console.warn('PocketBase registration note:', createErr);
      }

      // Try immediate auth with PocketBase
      try {
        const authData = await pb.collection('users').authWithPassword(email, password);
        setAppActivated(authData.record?.id || 'TRV-POCKETBASE');
      } catch (authErr) {
        console.warn('PocketBase login after activation note:', authErr);
      }

      saveStoredUserAccount(rawUsername, password);

      setStatus({
        success: true,
        message: isIt
          ? 'Account attivato con successo! Benvenuto in Travly.'
          : 'Account activated successfully! Welcome to Travly.',
      });

      setTimeout(() => {
        setLoading(false);
        onActivated(rawUsername, password);
      }, 600);
      return;
    }

    setLoading(false);
    setStatus(result);

    if (result.success) {
      setTimeout(() => {
        onActivated(accountInput.trim(), passInput.trim());
      }, 1000);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = resetEmail.trim();

    if (!emailToUse) {
      setResetStatus({
        success: false,
        message: isIt ? 'Inserisci un indirizzo email valido.' : 'Please enter a valid email address.',
      });
      return;
    }

    setResetLoading(true);
    setResetStatus(null);

    try {
      await pb.collection('users').requestPasswordReset(emailToUse);
      setResetStatus({
        success: true,
        message: isIt
          ? 'Email di ripristino inviata con successo! Controlla la tua casella di posta.'
          : 'Password reset email sent successfully! Please check your inbox.',
      });
    } catch (error: any) {
      console.error('PocketBase requestPasswordReset error:', error);
      const errMsg = formatPocketBaseError(error);
      alert(errMsg);
      setResetStatus({
        success: false,
        message: `Errore PocketBase: ${errMsg}`,
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      setResetConfirmStatus({
        success: false,
        message: isIt ? 'Token di ripristino non trovato o non valido nell\'URL.' : 'Invalid or missing reset token in URL.',
      });
      return;
    }

    if (!newPassword.trim()) {
      setResetConfirmStatus({
        success: false,
        message: isIt ? 'Inserisci la nuova password.' : 'Please enter the new password.',
      });
      return;
    }

    if (newPassword.trim().length < 8) {
      setResetConfirmStatus({
        success: false,
        message: isIt
          ? 'La password deve contenere almeno 8 caratteri.'
          : 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setResetConfirmStatus({
        success: false,
        message: isIt
          ? 'Le nuove password non coincidono. Verifica e riprova.'
          : 'Passwords do not match. Please verify.',
      });
      return;
    }

    setResetConfirmLoading(true);
    setResetConfirmStatus(null);

    try {
      await pb.collection('users').confirmPasswordReset(
        resetToken,
        newPassword.trim(),
        confirmNewPassword.trim()
      );

      // Clean token from URL
      try {
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch {}

      setResetConfirmStatus({
        success: true,
        message: isIt
          ? 'Password aggiornata con successo! Ora puoi effettuare il login.'
          : 'Password updated successfully! You can now log in.',
      });

      // Clear token and transition to login form
      setTimeout(() => {
        setResetToken('');
        setPassInput(newPassword.trim());
        setConfirmPassInput(newPassword.trim());
        setViewMode('form');
        setMode('login');
        setStatus({
          success: true,
          message: isIt
            ? 'Password aggiornata con successo! Ora puoi effettuare il login.'
            : 'Password updated successfully! You can now log in.',
        });
      }, 1500);
    } catch (error: any) {
      console.error('PocketBase confirmPasswordReset error:', error);
      const errMsg = formatPocketBaseError(error);
      alert(errMsg);
      setResetConfirmStatus({
        success: false,
        message: `Errore PocketBase: ${errMsg}`,
      });
    } finally {
      setResetConfirmLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 grid place-items-center z-[200] p-3 sm:p-4 overflow-y-auto ${
        isOverlay ? 'bg-[#0B172A]/90 backdrop-blur-md' : 'bg-[#0B172A]/60 backdrop-blur-xs'
      }`}
    >
      <div className="bg-[var(--card)] border border-[var(--line)] w-full max-w-lg rounded-[22px] shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* VIEW MODE: Forgot Password Screen */}
        {viewMode === 'forgot_password' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode('form');
                  setMode('login');
                }}
                className="p-2 bg-[var(--soft)] border border-[var(--line)] rounded-xl text-[var(--sub)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-extrabold text-[var(--ink)]">
                  {isIt ? 'Password Dimenticata?' : 'Forgot Password?'}
                </h2>
                <p className="text-xs text-[var(--sub)]">
                  {isIt ? 'Ripristina la password del tuo account PocketBase' : 'Reset your PocketBase password'}
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                  {isIt ? 'Email Account' : 'Account Email'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={isIt ? 'mario.rossi@gmail.com' : 'john.doe@gmail.com'}
                    className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {resetStatus && (
                <div
                  className={`p-3.5 rounded-[12px] text-xs font-semibold flex items-start gap-2.5 ${
                    resetStatus.success
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  {resetStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span className="whitespace-pre-line">{resetStatus.message}</span>
                </div>
              )}

              <div className="p-3 bg-[var(--soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--sub)] leading-relaxed space-y-1.5">
                <p className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#12B5A5]" />
                  <span>{isIt ? 'Informazioni Mittente:' : 'Sender Information:'}</span>
                </p>
                <p>
                  {isIt
                    ? `L'email verrà inviata da `
                    : `The email will be sent by `}
                  <strong className="text-[var(--ink)]">{TRAVLY_SUPPORT_SENDER_NAME}</strong>{' '}
                  (<a href={`mailto:${TRAVLY_SUPPORT_EMAIL}?subject=Supporto%20Reset%20Password`} className="text-[#12B5A5] hover:underline font-mono">{TRAVLY_SUPPORT_EMAIL}</a>).
                </p>
                <p className="text-[11px] text-[var(--sub)]/80">
                  {isIt
                    ? 'Se non vedi la mail entro 2 minuti, controlla anche la cartella Spam o contatta il supporto.'
                    : 'If you do not see the email within 2 minutes, check your Spam folder or contact support.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full py-3.5 px-4 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-[14px] transition-all shadow-lg shadow-[#12B5A5]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isIt ? 'Invio in corso...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isIt ? 'Invia Email di Ripristino' : 'Send Reset Email'}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('form');
                    setMode('login');
                  }}
                  className="text-xs font-bold text-[var(--sub)] hover:text-[var(--ink)] transition-colors cursor-pointer block mx-auto"
                >
                  {isIt ? 'Torna al Form di Login' : 'Back to Login'}
                </button>
                <div className="text-[11px] text-[var(--sub)]">
                  {isIt ? 'Serve aiuto? Scrivi a ' : 'Need help? Write to '}
                  <a
                    href={`mailto:${TRAVLY_SUPPORT_EMAIL}?subject=Assistenza%20Account%20Travly`}
                    className="text-[#12B5A5] hover:underline font-semibold"
                  >
                    {TRAVLY_SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* VIEW MODE: Reset Password from Email Link */}
        {viewMode === 'reset_password' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-[#12B5A5]/20 border border-[#12B5A5]/40 rounded-2xl mx-auto grid place-items-center text-[#12B5A5] shadow-lg">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[var(--ink)]">
                  {isIt ? 'Reimposta la tua Password' : 'Reset Your Password'}
                </h2>
                <p className="text-xs text-[var(--sub)] mt-1">
                  {isIt
                    ? 'Inserisci la tua nuova password per il tuo account PocketBase'
                    : 'Enter your new password for your PocketBase account'}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="space-y-4 pt-1">
              {/* Nuova Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                  {isIt ? '1. Nuova Password' : '1. New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isIt ? 'Minimo 8 caratteri' : 'At least 8 characters'}
                    className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-11 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ripeti Nuova Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                  {isIt ? '2. Ripeti Nuova Password' : '2. Confirm New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmNewPass ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={isIt ? 'Ripeti la nuova password' : 'Repeat the new password'}
                    className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-11 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                  />
                  <Lock className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1"
                  >
                    {showConfirmNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {resetConfirmStatus && (
                <div
                  className={`p-3.5 rounded-[12px] text-xs font-semibold flex items-start gap-2.5 ${
                    resetConfirmStatus.success
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  {resetConfirmStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span className="whitespace-pre-line">{resetConfirmStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetConfirmLoading || !newPassword.trim() || !confirmNewPassword.trim()}
                className="w-full py-3.5 px-4 bg-[#12B5A5] hover:bg-[#0EA294] text-white font-extrabold text-sm rounded-[14px] transition-all shadow-lg shadow-[#12B5A5]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetConfirmLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isIt ? 'Aggiornamento in corso...' : 'Updating...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isIt ? 'Aggiorna Password' : 'Update Password'}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('form');
                    setMode('login');
                  }}
                  className="text-xs font-bold text-[var(--sub)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                >
                  {isIt ? 'Torna al Form di Login' : 'Back to Login'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW MODE: Standard Form (Activate / Login) */}
        {viewMode === 'form' && (
          <>
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
                {/* Activation Code Input (Required in Activate mode) */}
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
                      ? isIt
                        ? '2. Nome Account Travly (Username)'
                        : '2. Travly Account Name (Username)'
                      : isIt
                      ? '1. Nome Account Travly o Email'
                      : '1. Travly Account Name or Email'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={accountInput}
                      onChange={(e) => setAccountInput(e.target.value)}
                      placeholder={
                        mode === 'activate'
                          ? isIt
                            ? 'es. mario.rossi'
                            : 'e.g. john.doe'
                          : isIt
                          ? 'Inserisci il tuo nome account o email'
                          : 'Enter your account name or email'
                      }
                      className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                      autoFocus={mode === 'login'}
                    />
                    <User className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Email Input (Field 3 on Activate Mode) */}
                {mode === 'activate' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                      {isIt ? '3. Indirizzo Email' : '3. Email Address'}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={isIt ? 'es. mario.rossi@gmail.com' : 'e.g. john.doe@gmail.com'}
                        className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                      />
                      <Mail className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Password Input (Field 4 on Activate, Field 2 on Login) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                    {mode === 'activate'
                      ? isIt
                        ? '4. Password Account Travly'
                        : '4. Travly Account Password'
                      : isIt
                      ? '2. Password Account'
                      : '2. Account Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      placeholder={
                        mode === 'activate'
                          ? isIt
                            ? 'Crea una password sicura'
                            : 'Create a secure password'
                          : isIt
                          ? 'Inserisci la tua password'
                          : 'Enter your password'
                      }
                      className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-11 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                    />
                    <Lock className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Forgot Password Link in Login Mode */}
                  {mode === 'login' && (
                    <div className="flex justify-end pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(accountInput.includes('@') ? accountInput.trim() : '');
                          setResetStatus(null);
                          setViewMode('forgot_password');
                        }}
                        className="text-xs font-semibold text-[#12B5A5] hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{isIt ? 'Password dimenticata?' : 'Forgot password?'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input (Field 5 on Activate Tab) */}
                {mode === 'activate' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--sub)] mb-2">
                      {isIt ? '5. Ripeti Password' : '5. Confirm Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassInput}
                        onChange={(e) => setConfirmPassInput(e.target.value)}
                        placeholder={isIt ? 'Ripeti la password inserita sopra' : 'Repeat password'}
                        className="w-full bg-[var(--soft)] border border-[var(--line)] focus:border-[#12B5A5] rounded-[14px] pl-11 pr-11 py-3 text-sm font-semibold text-[var(--ink)] outline-none transition-all placeholder:text-[var(--sub)]/40"
                      />
                      <Lock className="w-4 h-4 text-[#12B5A5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)] hover:text-[var(--ink)] transition-colors p-1 cursor-pointer"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

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
                        ? 'Puoi accedere con il tuo Account e Password su qualsiasi smartphone o computer per continuare a usare la tua licenza e sincronizzare i tuoi viaggi!'
                        : 'Log in with your Account & Password on any device to use your license and sync your trips!'}
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
                    <span className="whitespace-pre-line">{status.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !accountInput.trim() ||
                    !passInput.trim() ||
                    (mode === 'activate' && (!code.trim() || !emailInput.trim() || !confirmPassInput.trim()))
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

              {/* Security & Support Footer */}
              <div className="pt-2.5 border-t border-[var(--hair)] flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-[var(--sub)] font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#12B5A5]" />
                  {isIt ? 'Licenza personale e protetta' : 'Personal & secure license'}
                </span>
                <span className="flex items-center gap-1">
                  <span>{isIt ? 'Supporto:' : 'Support:'}</span>
                  <a
                    href={`mailto:${TRAVLY_SUPPORT_EMAIL}?subject=Supporto%20Travly`}
                    className="text-[#12B5A5] hover:underline font-semibold"
                  >
                    {TRAVLY_SUPPORT_EMAIL}
                  </a>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};



