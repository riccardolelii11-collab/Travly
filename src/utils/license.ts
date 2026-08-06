import { getSupabaseClient } from './supabase';

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
 * Verifies and activates a license code
 */
export async function verifyAndActivateCode(
  inputCode: string,
  userAccount?: string
): Promise<{ success: boolean; message: string }> {
  const cleanCode = inputCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Inserisci un codice di attivazione valido.' };
  }

  const deviceId = userAccount ? `${userAccount.toLowerCase()} (${getDeviceId()})` : getDeviceId();
  const supabase = getSupabaseClient();

  // Master override code for emergency/testing or admin
  if (cleanCode === 'TRV-ADMIN-2026' || cleanCode === 'TRAVLY-VIP-2026') {
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
        // If table doesn't exist yet, we check algorithmic format or fallback
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.message?.includes('does not exist')
        ) {
          // Fallback algorithm check if table not created yet in Supabase
          if (cleanCode.startsWith('TRV-') && cleanCode.length >= 12) {
            setAppActivated(cleanCode);
            return {
              success: true,
              message: 'Codice valido accettato! Travly è ora sbloccato.',
            };
          }
          return {
            success: false,
            message: 'Codice non trovato. Assicurati che la tabella travly_licenses sia stata creata in Supabase.',
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

      // Check if already used
      if (data.is_used) {
        // If it was used by the same device/user, allow re-activation
        if (data.used_by && data.used_by.includes(deviceId)) {
          setAppActivated(cleanCode);
          return { success: true, message: 'Codice già associato a questo dispositivo. Travly sbloccato!' };
        }
        return {
          success: false,
          message: 'Questo codice è già stato utilizzato da un altro utente o dispositivo.',
        };
      }

      // Mark code as used in Supabase
      const { error: updateErr } = await supabase
        .from('travly_licenses')
        .update({
          is_used: true,
          used_by: deviceId,
          used_at: new Date().toISOString(),
        })
        .eq('code', cleanCode);

      if (updateErr) {
        console.warn('Licence update warning:', updateErr);
      }

      setAppActivated(cleanCode);
      return { success: true, message: 'Codice attivato con successo! Travly è ora sbloccato.' };
    } catch (err: any) {
      console.error('License verify error:', err);
      // Fallback if network fails but code has valid prefix
      if (cleanCode.startsWith('TRV-') && cleanCode.length >= 12) {
        setAppActivated(cleanCode);
        return { success: true, message: 'Codice registrato localmente. Travly sbloccato.' };
      }
      return {
        success: false,
        message: err?.message || 'Errore di rete durante la verifica del codice.',
      };
    }
  } else {
    // If Supabase client not available, validate format
    if (cleanCode.startsWith('TRV-') && cleanCode.length >= 10) {
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
    created_at: new Date().toISOString(),
  }));

  try {
    const { data, error } = await supabase
      .from('travly_licenses')
      .upsert(rows, { onConflict: 'code', ignoreDuplicates: true })
      .select();

    if (error) {
      return { success: false, createdCount: 0, message: error.message };
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
    return data as LicenseItem[];
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used_at timestamp with time zone
);

alter table travly_licenses enable row level security;

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
  <title>Generatore Codici Travly</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0B132B; color: #fff; padding: 2rem; max-width: 600px; margin: auto; }
    .card { background: #1C2541; padding: 2rem; border-radius: 1rem; border: 1px solid #3A506B; }
    button { background: #12B5A5; color: #fff; border: none; padding: 0.75rem 1.5rem; font-weight: bold; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; width: 100%; margin-top: 1rem; }
    input, textarea { width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #3A506B; background: #0B132B; color: #fff; box-sizing: border-box; margin-top: 0.5rem; }
    .code-display { background: #000; padding: 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 1.2rem; color: #12B5A5; text-align: center; margin-top: 1rem; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Generatore Licenze Travly</h2>
    <p>Inserisci URL e Anon Key del tuo Supabase:</p>
    <label>Supabase URL:</label>
    <input id="sbUrl" placeholder="https://xxxx.supabase.co" value="https://pmuopkpjshwhenrmxuez.supabase.co">
    <label>Supabase Anon Key:</label>
    <textarea id="sbKey" rows="2">sb_publishable_iI0Cm1qwYDx8PVsgsMlk2A_D4AZQnSH</textarea>
    
    <button onclick="generateAndSave()">Genera & Salva Codice in Supabase</button>
    
    <div id="result" class="code-display" style="display:none;"></div>
  </div>

  <script>
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
          resDiv.innerText = 'Errore: ' + error.message;
        } else {
          resDiv.style.display = 'block';
          resDiv.innerText = 'CODICE GENERATO:\n' + newCode;
        }
      } catch (err) {
        resDiv.style.display = 'block';
        resDiv.innerText = 'Errore connessione: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
