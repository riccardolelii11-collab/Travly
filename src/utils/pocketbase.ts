import PocketBase from 'pocketbase';

export const POCKETBASE_URL = 'http://161.97.169.242:8090';

// Initialize PocketBase client pointing to PocketBase URL
export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto cancellation so multiple rapid requests don't cancel each other out
pb.autoCancellation(false);

/**
 * Registers a user in PocketBase collection 'users' and sends verification email.
 */
export async function registerPocketBaseUser(
  email: string,
  pass: string,
  passConfirm?: string
): Promise<{ success: boolean; message: string; record?: any }> {
  const cleanEmail = email.trim();
  const cleanPass = pass.trim();
  const cleanConfirm = (passConfirm || pass).trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Inserisci un\'email e una password valide.' };
  }

  try {
    // 1. Create user in the "users" collection
    let record;
    try {
      record = await pb.collection('users').create({
        email: cleanEmail,
        password: cleanPass,
        passwordConfirm: cleanConfirm,
        emailVisibility: true,
      });
    } catch (createErr: any) {
      const errMsg =
        createErr?.data?.message ||
        createErr?.message ||
        'Impossibile creare l\'utente su PocketBase.';

      // If user already exists, request verification email anyway
      try {
        await pb.collection('users').requestVerification(cleanEmail);
        return {
          success: true,
          message: `L'email '${cleanEmail}' risulta già registrata. Email di verifica inviata!`,
        };
      } catch {
        return {
          success: false,
          message: `Errore registrazione PocketBase: ${errMsg}`,
        };
      }
    }

    // 2. Request email verification
    try {
      await pb.collection('users').requestVerification(cleanEmail);
    } catch (verifErr) {
      console.warn('Note on requestVerification email:', verifErr);
    }

    return {
      success: true,
      record,
      message: `Utente registrato su PocketBase! Email di verifica inviata a ${cleanEmail}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Errore durante la registrazione con PocketBase.',
    };
  }
}

/**
 * Authenticates user via PocketBase authWithPassword.
 */
export async function loginPocketBaseUser(
  email: string,
  pass: string
): Promise<{ success: boolean; message: string; token?: string; record?: any }> {
  const cleanEmail = email.trim();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Inserisci email e password.' };
  }

  try {
    const authData = await pb.collection('users').authWithPassword(cleanEmail, cleanPass);
    return {
      success: true,
      token: authData.token,
      record: authData.record,
      message: `Accesso PocketBase riuscito! Benvenuto, ${authData.record?.email || cleanEmail}.`,
    };
  } catch (err: any) {
    const errMsg =
      err?.data?.message || err?.message || 'Credenziali PocketBase non valide.';
    return {
      success: false,
      message: `Errore Accesso PocketBase: ${errMsg}`,
    };
  }
}
