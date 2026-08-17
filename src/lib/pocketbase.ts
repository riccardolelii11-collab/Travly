import PocketBase from 'pocketbase';

const envUrl = import.meta.env.VITE_POCKETBASE_URL;

// Use VITE_POCKETBASE_URL if configured, otherwise default to https://pocketbase.tagliaetrasforma.it
export const pocketbaseUrl = envUrl || 'https://pocketbase.tagliaetrasforma.it';

export const pb = new PocketBase(pocketbaseUrl);

/**
 * Official Travly Support & System Email Settings
 */
export const TRAVLY_SUPPORT_EMAIL = 'support.travly@gmail.com';
export const TRAVLY_SUPPORT_SENDER_NAME = 'Travly Support';

/**
 * Default Email Templates & Metadata for Travly
 */
export const TRAVLY_EMAIL_CONFIG = {
  senderEmail: TRAVLY_SUPPORT_EMAIL,
  senderName: TRAVLY_SUPPORT_SENDER_NAME,
  supportMailto: `mailto:${TRAVLY_SUPPORT_EMAIL}?subject=Supporto%20Travly`,
  passwordResetSubject: 'Ripristino Password - Travly',
  verificationSubject: 'Verifica Account - Travly',
};

/**
 * Extracts verification token from URL search query, hash, or path
 */
export function extractVerificationToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check Query String params: ?verificationToken=... / ?verifyToken=...
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken =
      urlParams.get('verificationToken') ||
      urlParams.get('verifyToken') ||
      urlParams.get('confirmVerificationToken');
    if (queryToken && queryToken.trim().length > 5) {
      return queryToken.trim();
    }

    // If param is 'token' check if url path/hash indicates verification
    const standardToken = urlParams.get('token');
    const isVerificationUrl =
      window.location.pathname.includes('verification') ||
      window.location.pathname.includes('verify') ||
      window.location.hash.includes('verification') ||
      window.location.hash.includes('verify');

    if (standardToken && isVerificationUrl && standardToken.trim().length > 5) {
      return standardToken.trim();
    }

    // 2. Check Hash: e.g. #_verify/{TOKEN} or #/confirm-verification/{TOKEN}
    const hash = window.location.hash;
    if (hash) {
      if (
        hash.includes('verification') ||
        hash.includes('confirm-verification') ||
        hash.includes('_verify') ||
        hash.includes('verify-email')
      ) {
        const parts = hash.split('/');
        const lastPart = parts[parts.length - 1]?.split('?')[0]?.split('&')[0];
        if (lastPart && lastPart.length > 5 && !lastPart.startsWith('#')) {
          return lastPart.trim();
        }
      }

      const cleanHash = hash.replace(/^#[/?]*/, '');
      const hashParams = new URLSearchParams(cleanHash);
      const hashToken =
        hashParams.get('verificationToken') ||
        hashParams.get('verifyToken') ||
        (isVerificationUrl ? hashParams.get('token') : null);
      if (hashToken && hashToken.trim().length > 5) {
        return hashToken.trim();
      }
    }

    // 3. Check Pathname: /confirm-verification/{TOKEN} or /verify/{TOKEN}
    const pathname = window.location.pathname;
    if (pathname) {
      const match = pathname.match(/(?:confirm-verification|verify-email|verify)\/([^/?#]+)/i);
      if (match && match[1] && match[1].trim().length > 5) {
        return match[1].trim();
      }
    }
  } catch (err) {
    console.warn('Error extracting verification token from URL:', err);
  }

  return null;
}

/**
 * Extracts password reset token from URL search query, hash, or path
 */
export function extractResetToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check Query String params: ?token=... / ?resetToken=... / ?token_hash=...
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken =
      urlParams.get('token') ||
      urlParams.get('resetToken') ||
      urlParams.get('token_hash') ||
      urlParams.get('key');
    if (queryToken && queryToken.trim().length > 5) {
      return queryToken.trim();
    }

    // 2. Check Hash: e.g. #_reset-password/{TOKEN} or #token={TOKEN} or #reset-password/{TOKEN}
    const hash = window.location.hash;
    if (hash) {
      // Check slash separated format like #_reset-password/TOKEN or #/reset-password/TOKEN
      if (
        hash.includes('reset-password') ||
        hash.includes('confirm-password-reset') ||
        hash.includes('_reset-password')
      ) {
        const parts = hash.split('/');
        const lastPart = parts[parts.length - 1]?.split('?')[0]?.split('&')[0];
        if (lastPart && lastPart.length > 5 && !lastPart.startsWith('#')) {
          return lastPart.trim();
        }
      }

      // Check query-style inside hash e.g. #token=TOKEN or #?token=TOKEN
      const cleanHash = hash.replace(/^#[/?]*/, '');
      const hashParams = new URLSearchParams(cleanHash);
      const hashToken =
        hashParams.get('token') ||
        hashParams.get('resetToken') ||
        hashParams.get('token_hash');
      if (hashToken && hashToken.trim().length > 5) {
        return hashToken.trim();
      }
    }

    // 3. Check Pathname: /confirm-password-reset/{TOKEN} or /reset-password/{TOKEN}
    const pathname = window.location.pathname;
    if (pathname) {
      const match = pathname.match(/(?:reset-password|confirm-password-reset)\/([^/?#]+)/i);
      if (match && match[1] && match[1].trim().length > 5) {
        return match[1].trim();
      }
    }
  } catch (err) {
    console.warn('Error extracting reset token from URL:', err);
  }

  return null;
}

