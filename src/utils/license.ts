import { getSupabaseClient } from './supabase';
import { pb } from './pocketbase';

const ACTIVATED_STORAGE_KEY = 'travly_is_activated';
const ACTIVE_CODE_STORAGE_KEY = 'travly_activated_code';
const DEVICE_ID_STORAGE_KEY = 'travly_device_id';

export interface LicenseItem {
  code: string;
  is_used: boolean;
  used_by: string | null;
  created_at: string;
  used_at: string | null;
  note?: string;
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}

export function isAppActivated(): boolean {
  return localStorage.getItem(ACTIVATED_STORAGE_KEY) === 'true';
}

export function getActivatedCode(): string {
  return localStorage.getItem(ACTIVE_CODE_STORAGE_KEY) || '';
}

export function setAppActivated(code: string): void {
  localStorage.setItem(ACTIVATED_STORAGE_KEY, 'true');
  localStorage.setItem(ACTIVE_CODE_STORAGE_KEY, code.toUpperCase().trim());
}

export function clearAppActivated(): void {
  localStorage.removeItem(ACTIVATED_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_CODE_STORAGE_KEY);
  localStorage.removeItem('travly_user_account');
  localStorage.removeItem('travly_user_password');
}

/**
 * Generate a standard Travly activation code (e.g. TRV-8A2F-9K31-4P02)
 */
export function generateRandomCode(prefix = 'TRV'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `${prefix}-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

/**
 * Marks an account as permanently deleted in Supabase and FREES UP its license code so it becomes available again.
 */
export async function markAccountDeletedInSupabase(accountName: string): Promise<boolean> {
  const cleanAcc = accountName.trim().toLowerCase();
  if (!cleanAcc) return false;

  const supabase = getSupabaseClient();

  // Clean local storage for this account
  localStorage.removeItem(`travly_deleted_${cleanAcc}`);
  localStorage.removeItem(`travly_deleted_backup_${cleanAcc}`);
  localStorage.removeItem('travly_user_account');
  localStorage.removeItem('travly_user_password');
  clearAppActivated();

  if (supabase) {
    try {
      // Find all licenses associated with this account in travly_licenses
      const { data } = await supabase
        .from('travly_licenses')
        .select('*');

      if (data && Array.isArray(data)) {
        const matches = data.filter(
          (item: any) =>
            item.used_by &&
            item.used_by.trim().toLowerCase() === cleanAcc
        );

        // Reset the license codes so they become AVAILABLE (is_used = false) again for reuse
        for (const lic of matches) {
          await supabase
            .from('travly_licenses')
            .update({
              is_used: false,
              used_by: null,
              user_pass: null,
              used_at: null,
              deleted_at: null,
            })
            .eq('code', lic.code);
        }
      }

      // Delete backups for this user in travly_backups
      await supabase
        .from('travly_backups')
        .delete()
        .eq('user_account', cleanAcc);

    } catch (err) {
      console.warn('Notice resetting license in Supabase upon account deletion:', err);
    }
  }

  return true;
}

/**
 * Legacy stub for grace period checks
 */
export function isWithin15DaysGrace(_deletedAtStr?: string | null): { expired: boolean; daysLeft: number } {
  return { expired: false, daysLeft: 0 };
}

/**
 * Verifies credentials and logs in an existing account
 */
export async function verifyLoginAccount(
  userAccount: string,
  userPass: string
): Promise<{ success: boolean; message: string; code?: string }> {
  const cleanAcc = userAccount.trim().toLowerCase();
  const cleanPass = userPass.trim();

  if (!cleanAcc || !cleanPass) {
    return { success: false, message: 'Inserisci sia il nome account che la password.' };
  }

  // PocketBase Authentication check
  try {
    const authData = await pb.collection('users').authWithPassword(cleanAcc, cleanPass);
    if (authData && authData.token) {
      localStorage.setItem('travly_user_account', cleanAcc);
      localStorage.setItem('travly_user_password', cleanPass);
      const codeToUse = getActivatedCode() || 'TRV-POCKETBASE';
      setAppActivated(codeToUse);
      return {
        success: true,
        code: codeToUse,
        message: `Accesso PocketBase effettuato con successo! Benvenuto '${cleanAcc}'.`,
      };
    }
  } catch (pbErr: any) {
    console.warn('PocketBase auth in verifyLoginAccount notice:', pbErr);
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('travly_licenses')
        .select('*');

      if (!error && Array.isArray(data)) {
        // Search ONLY for an active license explicitly assigned EXACTLY to this account name
        const match = data.find((item: any) => {
          const dbUsedBy = (item.used_by || '').trim().toLowerCase();
          const isUsedBool =
            item.is_used === true ||
            item.is_used === 'true' ||
            item.is_used === 1 ||
            Boolean(dbUsedBy.length > 0);

          const accountMatch = dbUsedBy === cleanAcc;
          return isUsedBool && accountMatch;
        });

        if (match) {
          // Verify password
          if (match.user_pass && match.user_pass !== cleanPass) {
            return { success: false, message: `Password errata per l'account '${userAccount}'.` };
          }

          // Ensure license remains marked as used in Supabase
          await supabase
            .from('travly_licenses')
            .update({
              is_used: true,
              used_by: cleanAcc,
              user_pass: cleanPass,
              deleted_at: null,
            })
            .eq('code', match.code);

          // Save local login credentials
          localStorage.setItem('travly_user_account', cleanAcc);
          localStorage.setItem('travly_user_password', cleanPass);

          setAppActivated(match.code);
          return {
            success: true,
            code: match.code,
            message: `Accesso effettuato! Benvenuto, '${userAccount}'.`,
          };
        }
      }
    } catch (err: any) {
      console.warn('Login verification cloud note:', err);
    }
  }

  // Fallback: check local storage if offline/no supabase connection, but ONLY if account name matches EXACTLY
  const storedAcc = (localStorage.getItem('travly_user_account') || '').trim().toLowerCase();
  const storedPass = (localStorage.getItem('travly_user_password') || '').trim();
  const storedCode = getActivatedCode();

  if (storedAcc && storedAcc === cleanAcc) {
    if (storedPass && storedPass !== cleanPass) {
      return { success: false, message: `Password errata per l'account '${userAccount}'.` };
    }
    const codeToUse = storedCode || 'TRV-LOCAL-LOGIN';
    setAppActivated(codeToUse);
    return {
      success: true,
      code: codeToUse,
      message: `Accesso effettuato con successo!`,
    };
  }

  // Strictly return error if account does not exist or was deleted. Never create or auto-activate in Login mode.
  return {
    success: false,
    message: `L'account '${userAccount}' non esiste o è stato eliminato. Per attivare l'applicazione, vai sulla scheda 'Attiva Codice' con un codice di attivazione valido.`,
  };
}

/**
 * Verifies and activates a license code with Account + Password
 */
export async function verifyAndActivateCode(
  inputCode: string,
  userAccount: string,
  userPass: string
): Promise<{ success: boolean; message: string }> {
  const cleanCode = inputCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Inserisci un codice di attivazione valido.' };
  }

  const cleanAcc = userAccount ? userAccount.trim().toLowerCase() : '';
  const cleanPass = userPass ? userPass.trim() : '';

  if (!cleanAcc) {
    return { success: false, message: 'Inserisci il Nome Account Travly.' };
  }
  if (!cleanPass) {
    return { success: false, message: 'Inserisci la Password per il tuo Account.' };
  }

  // PocketBase registration attempt
  try {
    await pb.collection('users').create({
      email: cleanAcc,
      password: cleanPass,
      passwordConfirm: cleanPass,
      emailVisibility: true,
    });
    await pb.collection('users').requestVerification(cleanAcc);
  } catch (pbErr: any) {
    console.warn('PocketBase create in verifyAndActivateCode notice:', pbErr);
  }

  const supabase = getSupabaseClient();

  // Master override code for emergency/testing or admin
  if (cleanCode === 'TRV-ADMIN-2026' || cleanCode === 'TRAVLY-VIP-2026') {
    localStorage.setItem('travly_user_account', cleanAcc);
    localStorage.setItem('travly_user_password', cleanPass);
    setAppActivated(cleanCode);
    return { success: true, message: 'Codice Master accettato! Applicazione sbloccata.' };
  }

  if (supabase) {
    try {
      // Check in Supabase travly_licenses table
      const { data, error } = await supabase
        .from('travly_licenses')
        .select('*')
        .eq('code', cleanCode)
        .single();

      if (error) {
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.message?.includes('does not exist')
        ) {
          if (cleanCode.startsWith('TRV-') && cleanCode.length >= 10) {
            // Register new code in Supabase so it is recorded as used
            const insertPayload = {
              code: cleanCode,
              is_used: true,
              used_by: cleanAcc,
              user_pass: cleanPass,
              created_at: new Date().toISOString(),
              used_at: new Date().toISOString(),
            };
            const { error: insErr } = await supabase.from('travly_licenses').insert(insertPayload);
            if (insErr) {
              console.warn('Primary insert failed, retrying core fields:', insErr);
              await supabase.from('travly_licenses').insert({
                code: cleanCode,
                is_used: true,
                used_by: cleanAcc,
                created_at: new Date().toISOString(),
                used_at: new Date().toISOString(),
              });
            }

            localStorage.setItem('travly_user_account', cleanAcc);
            localStorage.setItem('travly_user_password', cleanPass);
            setAppActivated(cleanCode);
            return {
              success: true,
              message: 'Codice attivato e registrato in Supabase! Travly è sbloccato.',
            };
          }
          return {
            success: false,
            message: 'Codice non trovato in Supabase. Verifica il codice e riprova.',
          };
        }
        return {
          success: false,
          message: `Errore verifica codice: ${error.message || 'Codice non trovato'}`,
        };
      }

      if (!data) {
        return { success: false, message: 'Codice di attivazione non valido o inesistente.' };
      }

      const dbUsedBy = (data.used_by || '').toLowerCase();
      const isAlreadyUsed =
        data.is_used === true ||
        data.is_used === 'true' ||
        data.is_used === 1 ||
        Boolean(dbUsedBy && dbUsedBy.trim().length > 0);

      // Check if already used
      if (isAlreadyUsed) {
        const isSameAccount = cleanAcc && dbUsedBy.trim().toLowerCase() === cleanAcc;

        if (isSameAccount) {
          // Update password if needed
          await supabase
            .from('travly_licenses')
            .update({
              user_pass: cleanPass,
              deleted_at: null,
            })
            .eq('code', cleanCode);

          localStorage.setItem('travly_user_account', cleanAcc);
          localStorage.setItem('travly_user_password', cleanPass);
          setAppActivated(cleanCode);
          return {
            success: true,
            message: `Bentornato! Codice verificato per l'account '${userAccount}'. Travly sbloccato!`,
          };
        }

        return {
          success: false,
          message: dbUsedBy
            ? `Questo codice risulta già attivato dall'account '${data.used_by}'. Se è il tuo account, usa la scheda 'Accedi' inserendo la password corretta.`
            : 'Questo codice è già stato utilizzato da un altro utente.',
        };
      }

      // Mark code as USED (is_used = true) in Supabase with account association and password
      const updatePayload = {
        is_used: true,
        used_by: cleanAcc,
        user_pass: cleanPass,
        deleted_at: null,
        used_at: new Date().toISOString(),
      };
      const { error: updateErr } = await supabase
        .from('travly_licenses')
        .update(updatePayload)
        .eq('code', cleanCode);

      if (updateErr) {
        console.warn('Licence primary update warning, trying fallback without user_pass:', updateErr);
        await supabase
          .from('travly_licenses')
          .update({
            is_used: true,
            used_by: cleanAcc,
            used_at: new Date().toISOString(),
          })
          .eq('code', cleanCode);
      }

      localStorage.setItem('travly_user_account', cleanAcc);
      localStorage.setItem('travly_user_password', cleanPass);
      setAppActivated(cleanCode);
      return {
        success: true,
        message: `Codice attivato e registrato con successo in Supabase per l'account '${userAccount}'!`,
      };
    } catch (err: any) {
      console.error('License verify error:', err);
      if (cleanCode.startsWith('TRV-') && cleanCode.length >= 10) {
        localStorage.setItem('travly_user_account', cleanAcc);
        localStorage.setItem('travly_user_password', cleanPass);
        setAppActivated(cleanCode);
        return { success: true, message: 'Codice registrato localmente. Travly sbloccato.' };
      }
      return {
        success: false,
        message: err?.message || 'Errore di rete durante la verifica del codice.',
      };
    }
  } else {
    if (cleanCode.startsWith('TRV-') && cleanCode.length >= 10) {
      localStorage.setItem('travly_user_account', cleanAcc);
      localStorage.setItem('travly_user_password', cleanPass);
      setAppActivated(cleanCode);
      return { success: true, message: 'Codice registrato localmente! Travly è ora sbloccato.' };
    }
    return {
      success: false,
      message: 'Formato codice non valido. Il codice deve iniziare con TRV-',
    };
  }
}

/**
 * Creates one or more license codes in Supabase
 */
export async function createLicensesInSupabase(
  codes: string[]
): Promise<{ success: boolean; createdCount: number; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, createdCount: 0, message: 'Supabase non è configurato.' };
  }

  const rows = codes.map((c) => ({
    code: c.trim().toUpperCase(),
    is_used: false,
    used_by: null,
    created_at: new Date().toISOString(),
  }));

  try {
    const { data, error } = await supabase
      .from('travly_licenses')
      .upsert(rows, { onConflict: 'code', ignoreDuplicates: true })
      .select();

    if (error) {
      console.warn('Upsert warning in createLicensesInSupabase, trying insert fallback:', error);
      let created = 0;
      for (const row of rows) {
        const { error: insErr } = await supabase.from('travly_licenses').insert(row);
        if (!insErr) created++;
      }
      return {
        success: created > 0,
        createdCount: created,
        message: `${created} codice/i salvato/i con successo in Supabase!`,
      };
    }

    return {
      success: true,
      createdCount: data ? data.length : rows.length,
      message: `${data ? data.length : rows.length} codici salvati con successo in Supabase!`,
    };
  } catch (err: any) {
    return { success: false, createdCount: 0, message: err?.message || 'Errore salvataggio codici' };
  }
}

/**
 * Fetches all licenses from Supabase for the Admin
 */
export async function fetchAllLicensesFromSupabase(): Promise<LicenseItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('travly_licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item: any) => {
      const isUsedBool =
        item.is_used === true ||
        item.is_used === 'true' ||
        item.is_used === 1 ||
        Boolean(item.used_by && String(item.used_by).trim().length > 0);

      return {
        code: item.code,
        is_used: isUsedBool,
        used_by: item.used_by || null,
        created_at: item.created_at || new Date().toISOString(),
        used_at: item.used_at || null,
        user_pass: item.user_pass || null,
      };
    }) as LicenseItem[];
  } catch {
    return [];
  }
}

export const SUPABASE_LICENSES_SQL_SCRIPT = `-- ==========================================
-- TABELLA LICENZE E CODICI DI ATTIVAZIONE
-- ==========================================
create table if not exists travly_licenses (
  code text primary key,
  is_used boolean default false,
  used_by text,
  user_pass text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used_at timestamp with time zone,
  deleted_at timestamp with time zone
);

alter table travly_licenses add column if not exists user_pass text;
alter table travly_licenses add column if not exists deleted_at timestamp with time zone;

alter table travly_licenses enable row level security;

drop policy if exists "Accesso pubblico licenze" on travly_licenses;
drop policy if exists "Public select licenses" on travly_licenses;
create policy "Public select licenses" on travly_licenses for select using (true);

drop policy if exists "Public insert licenses" on travly_licenses;
create policy "Public insert licenses" on travly_licenses for insert with check (true);

drop policy if exists "Public update licenses" on travly_licenses;
create policy "Public update licenses" on travly_licenses for update using (true);

drop policy if exists "Public delete licenses" on travly_licenses;
create policy "Public delete licenses" on travly_licenses for delete using (true);
`;

export const EXTERNAL_GENERATOR_HTML_CODE = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generatore Licenze Travly</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0B132B; color: #fff; padding: 2rem; max-width: 650px; margin: auto; }
    .card { background: #1C2541; padding: 2rem; border-radius: 1rem; border: 1px solid #3A506B; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .badge { background: rgba(245, 158, 11, 0.2); color: #F59E0B; padding: 0.2rem 0.6rem; border-radius: 50px; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(245,158,11,0.4); }
    button { background: #12B5A5; color: #fff; border: none; padding: 0.75rem 1.5rem; font-weight: bold; border-radius: 0.5rem; cursor: pointer; font-size: 0.95rem; width: 100%; margin-top: 1rem; }
    button:hover { background: #0EA294; }
    input, textarea { width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #3A506B; background: #0B172A; color: #fff; box-sizing: border-box; margin-top: 0.5rem; }
    .code-display { background: #000; padding: 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 1.1rem; color: #12B5A5; text-align: center; margin-top: 1rem; word-break: break-all; border: 1px solid #12B5A5; }
    .lic-item { padding: 0.75rem; border-bottom: 1px solid #3A506B; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
    .tag-used { background: rgba(245, 158, 11, 0.2); color: #F59E0B; padding: 0.2rem 0.5rem; border-radius: 50px; font-size: 0.7rem; font-weight: 800; }
    .tag-avail { background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 0.2rem 0.5rem; border-radius: 50px; font-size: 0.7rem; font-weight: 800; }
  </style>
</head>
<body>
  <div class="card">
    <div id="gate" style="text-align: center;">
      <span class="badge">🔒 Area Riservata Admin</span>
      <h2 style="margin-top:0.5rem;">Accesso Generatore Licenze</h2>
      <p style="color:#9FB1CE; font-size:0.85rem;">Inserisci la password di amministrazione per proseguire.</p>
      <input type="password" id="pwd" placeholder="PASSWORD ADMIN" style="text-align:center; font-size:1.2rem; font-weight:800; letter-spacing:0.2em; margin-bottom:1rem;" autofocus>
      <button onclick="checkPass()">🔑 Sblocca Generatore</button>
      <div id="gateErr" style="color:#EF4444; margin-top:0.5rem; font-size:0.85rem;"></div>
    </div>

    <div id="app" style="display:none;">
      <span class="badge">🔒 Autenticato Admin</span>
      <h2 style="margin-top:0.5rem;">Generatore Licenze Travly</h2>
      <p style="color:#9FB1CE; font-size:0.85rem;">I codici generati verranno salvati nella tabella separata <code>travly_licenses</code> in Supabase.</p>
      
      <label>Supabase URL:</label>
      <input id="sbUrl" placeholder="https://xxxx.supabase.co" value="https://pmuopkpjshwhenrmxuez.supabase.co">
      <label>Supabase Anon Key:</label>
      <textarea id="sbKey" rows="2">sb_publishable_iI0Cm1qwYDx8PVsgsMlk2A_D4AZQnSH</textarea>
      
      <button onclick="generateAndSave()">⚡ Genera & Salva Codice in Supabase</button>
      
      <div id="result" class="code-display" style="display:none;"></div>

      <div style="margin-top: 1.5rem; border-top: 1px solid #3A506B; padding-top: 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:1rem;">📋 Stato Licenze in Supabase</h3>
          <button style="width:auto; padding:0.4rem 0.8rem; font-size:0.75rem; margin:0;" onclick="loadDb()">🔄 Ricarica</button>
        </div>
        <div id="dbList" style="background:#0B172A; border:1px solid #3A506B; border-radius:0.5rem; max-height:220px; overflow-y:auto; margin-top:0.75rem;"></div>
      </div>
    </div>
  </div>

  <script>
    if (sessionStorage.getItem('travly_authed') === 'true') {
      showApp();
    }

    function checkPass() {
      const p = document.getElementById('pwd').value.trim();
      if (p === 'CIUCCIO') {
        sessionStorage.setItem('travly_authed', 'true');
        showApp();
      } else {
        document.getElementById('gateErr').innerText = 'Password errata!';
      }
    }

    function showApp() {
      document.getElementById('gate').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      loadDb();
    }

    async function generateAndSave() {
      const url = document.getElementById('sbUrl').value.trim();
      const key = document.getElementById('sbKey').value.trim();
      const resDiv = document.getElementById('result');
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const chunk = () => Array.from({length: 4}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      const newCode = 'TRV-' + chunk() + '-' + chunk() + '-' + chunk();
      
      try {
        const supabase = window.supabase.createClient(url, key);
        const { error } = await supabase.from('travly_licenses').insert({
          code: newCode,
          is_used: false,
          created_at: new Date().toISOString()
        });
        
        if (error) {
          resDiv.style.display = 'block';
          resDiv.innerText = 'Errore Supabase: ' + error.message;
        } else {
          resDiv.style.display = 'block';
          resDiv.innerText = 'CODICE GENERATO:\n' + newCode;
          loadDb();
        }
      } catch (err) {
        resDiv.style.display = 'block';
        resDiv.innerText = 'Errore connessione: ' + err.message;
      }
    }

    async function loadDb() {
      const url = document.getElementById('sbUrl').value.trim();
      const key = document.getElementById('sbKey').value.trim();
      const dbList = document.getElementById('dbList');

      if (!url || !key) return;

      try {
        const supabase = window.supabase.createClient(url, key);
        const { data, error } = await supabase.from('travly_licenses').select('*').order('created_at', { ascending: false });
        if (error || !data) {
          dbList.innerHTML = '<div style="padding:0.75rem; color:#EF4444;">Errore: ' + (error ? error.message : 'Nessun dato') + '</div>';
          return;
        }

        let html = '';
        data.forEach(lic => {
          const badge = lic.is_used ? '<span class="tag-used">🔴 GIÀ USATO</span>' : '<span class="tag-avail">🟢 DISPONIBILE</span>';
          const info = lic.is_used ? '<div style="color:#F59E0B; font-size:0.75rem;">' + (lic.used_by || 'Utente registrato') + '</div>' : '<div style="color:#10B981; font-size:0.75rem;">In attesa di attivazione</div>';
          html += '<div class="lic-item"><div><strong style="font-family:monospace; font-size:0.95rem;">' + lic.code + '</strong>' + info + '</div>' + badge + '</div>';
        });
        dbList.innerHTML = html || '<div style="padding:0.75rem; color:#9FB1CE;">Nessuna licenza trovata.</div>';
      } catch (e) {
        dbList.innerHTML = '<div style="padding:0.75rem; color:#EF4444;">Eccezione: ' + e.message + '</div>';
      }
    }
  </script>
</body>
</html>`;
