/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppDatabase } from '../types';

const STORAGE_URL_KEY = 'travly_supabase_url';
const STORAGE_ANON_KEY = 'travly_supabase_anon_key';

const STORAGE_USER_ACCOUNT_KEY = 'travly_user_account';
const STORAGE_USER_PASS_KEY = 'travly_user_password';
const LOCAL_BACKUPS_KEY = 'travly_local_backups_v1';

export interface BackupSnapshot {
  id: string;
  userAccount: string;
  label: string;
  createdAt: string;
  tripCount: number;
  data: AppDatabase;
}

export function getStoredUserAccount(): { account: string; pass: string } {
  const account = (localStorage.getItem(STORAGE_USER_ACCOUNT_KEY) || '').trim();
  const pass = (localStorage.getItem(STORAGE_USER_PASS_KEY) || '').trim();
  return { account, pass };
}

export function saveStoredUserAccount(account: string, pass: string) {
  if (account) {
    localStorage.setItem(STORAGE_USER_ACCOUNT_KEY, account.trim().toLowerCase());
  } else {
    localStorage.removeItem(STORAGE_USER_ACCOUNT_KEY);
  }

  if (pass) {
    localStorage.setItem(STORAGE_USER_PASS_KEY, pass.trim());
  } else {
    localStorage.removeItem(STORAGE_USER_PASS_KEY);
  }
}

export function clearStoredUserAccount() {
  localStorage.removeItem(STORAGE_USER_ACCOUNT_KEY);
  localStorage.removeItem(STORAGE_USER_PASS_KEY);
}

const DEFAULT_SUPABASE_URL = 'https://pmuopkpjshwhenrmxuez.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_iI0Cm1qwYDx8PVsgsMlk2A_D4AZQnSH';

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  let rawUrl = (localUrl || envUrl || DEFAULT_SUPABASE_URL).trim();
  let anonKey = (localKey || envKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  if (rawUrl.includes('/rest/v1')) {
    rawUrl = rawUrl.split('/rest/v1')[0];
  }
  rawUrl = rawUrl.replace(/\/+$/, '');

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        rawUrl = DEFAULT_SUPABASE_URL;
      }
    } catch {
      rawUrl = DEFAULT_SUPABASE_URL;
    }
  } else {
    rawUrl = DEFAULT_SUPABASE_URL;
  }

  if (!anonKey) {
    anonKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  return { url: rawUrl, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  let cleanUrl = url.trim();
  if (cleanUrl.includes('/rest/v1')) {
    cleanUrl = cleanUrl.split('/rest/v1')[0];
  }
  cleanUrl = cleanUrl.replace(/\/+$/, '');

  if (cleanUrl) {
    localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
  }

  if (anonKey.trim()) {
    localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(STORAGE_ANON_KEY);
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    cachedClient = null;
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey);
    lastUrl = url;
    lastKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCRIPT = `-- Execute this script in your Supabase SQL Editor:
create table if not exists travly_db (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists travly_backups (
  id text primary key,
  user_account text not null,
  label text,
  trip_count integer default 0,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table travly_db enable row level security;
alter table travly_backups enable row level security;

drop policy if exists "Public select db" on travly_db;
create policy "Public select db" on travly_db for select using (true);
drop policy if exists "Public insert db" on travly_db;
create policy "Public insert db" on travly_db for insert with check (true);
drop policy if exists "Public update db" on travly_db;
create policy "Public update db" on travly_db for update using (true);
drop policy if exists "Public delete db" on travly_db;
create policy "Public delete db" on travly_db for delete using (true);

drop policy if exists "Public select backups" on travly_backups;
create policy "Public select backups" on travly_backups for select using (true);
drop policy if exists "Public insert backups" on travly_backups;
create policy "Public insert backups" on travly_backups for insert with check (true);
drop policy if exists "Public delete backups" on travly_backups;
create policy "Public delete backups" on travly_backups for delete using (true);

-- Tabella Licenze / Codici di Attivazione
create table if not exists travly_licenses (
  code text primary key,
  is_used boolean default false,
  used_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used_at timestamp with time zone
);

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

export async function loadFromSupabase(accountKey: string = 'main'): Promise<AppDatabase | null> {
  const supabase = getSupabaseClient();
  const id = accountKey.trim().toLowerCase() || 'main';

  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('travly_db')
      .select('data')
      .eq('id', id)
      .single();

    if (error) {
      if (
        error.code === 'PGRST116' ||
        error.code === 'PGRST204' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        return null;
      }
      console.warn('Supabase fetch notice:', error.message || error);
      return null;
    }

    if (data && data.data) {
      return data.data as AppDatabase;
    }
    return null;
  } catch (err: any) {
    console.warn('Supabase load note:', err?.message || err);
    return null;
  }
}

export async function saveToSupabase(db: AppDatabase, accountKey: string = 'main'): Promise<boolean> {
  const supabase = getSupabaseClient();
  const id = accountKey.trim().toLowerCase() || 'main';

  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('travly_db')
      .upsert({
        id: id,
        data: db,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('Supabase save notice:', error.message || error);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('Supabase save note:', err?.message || err);
    return false;
  }
}

// Backup Snapshots Management
export function getLocalBackups(accountKey: string): BackupSnapshot[] {
  const key = accountKey.trim().toLowerCase();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_BACKUPS_KEY}_${key}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalBackup(accountKey: string, db: AppDatabase, label: string): BackupSnapshot {
  const key = accountKey.trim().toLowerCase();
  if (!key) throw new Error('Account key is required to save local backup');
  const backups = getLocalBackups(key);
  const newSnapshot: BackupSnapshot = {
    id: 'backup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userAccount: key,
    label: label || `Backup ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    tripCount: db.trips?.length || 0,
    data: db,
  };

  const updated = [newSnapshot, ...backups].slice(0, 20); // Keep last 20 backups
  localStorage.setItem(`${LOCAL_BACKUPS_KEY}_${key}`, JSON.stringify(updated));
  return newSnapshot;
}

export async function fetchBackupSnapshots(accountKey: string): Promise<BackupSnapshot[]> {
  const key = accountKey.trim().toLowerCase();
  if (!key) return [];

  const supabase = getSupabaseClient();
  const localList = getLocalBackups(key);

  if (!supabase) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('travly_backups')
      .select('*')
      .eq('user_account', key)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return localList;
    }

    const cloudBackups: BackupSnapshot[] = data.map((item: any) => ({
      id: item.id,
      userAccount: item.user_account,
      label: item.label,
      createdAt: item.created_at,
      tripCount: item.trip_count || 0,
      data: item.data,
    }));

    // Merge local and cloud backups, deduplicating by id
    const map = new Map<string, BackupSnapshot>();
    [...cloudBackups, ...localList].forEach((b) => {
      if (!map.has(b.id)) map.set(b.id, b);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return localList;
  }
}

export async function createBackupSnapshot(
  accountKey: string,
  db: AppDatabase,
  label?: string
): Promise<{ success: boolean; snapshot: BackupSnapshot }> {
  const key = accountKey.trim().toLowerCase();
  if (!key) {
    throw new Error('Account key is required');
  }
  const snapshotLabel = label || `Backup ${new Date().toLocaleString()}`;

  const localSnap = saveLocalBackup(key, db, snapshotLabel);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: true, snapshot: localSnap };
  }

  try {
    const { error } = await supabase.from('travly_backups').insert({
      id: localSnap.id,
      user_account: key,
      label: localSnap.label,
      trip_count: localSnap.tripCount,
      data: localSnap.data,
      created_at: localSnap.createdAt,
    });

    if (error) {
      console.warn('Could not insert cloud backup record:', error);
    }
    return { success: true, snapshot: localSnap };
  } catch {
    return { success: true, snapshot: localSnap };
  }
}

export async function deleteBackupSnapshot(id: string, accountKey: string): Promise<boolean> {
  const key = accountKey.trim().toLowerCase();
  if (!key) return false;

  // Remove from local
  const localList = getLocalBackups(key).filter((b) => b.id !== id);
  localStorage.setItem(`${LOCAL_BACKUPS_KEY}_${key}`, JSON.stringify(localList));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('travly_backups').delete().eq('id', id);
    } catch {
      // ignore
    }
  }
  return true;
}

export async function deleteAccountAndData(accountKey: string): Promise<boolean> {
  const key = accountKey.trim().toLowerCase();
  if (!key) return false;

  // 1. Remove local backups & keys for this account key
  try {
    localStorage.removeItem(`${LOCAL_BACKUPS_KEY}_${key}`);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.includes(key) || k.startsWith('travly_backups_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Error clearing local storage keys:', e);
  }

  // 2. Clear credentials from local storage
  clearStoredUserAccount();

  // 3. Delete row from Supabase cloud if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error: err1 } = await supabase.from('travly_db').delete().eq('id', key);
      const { error: err2 } = await supabase.from('travly_backups').delete().eq('user_account', key);

      if (err1 && !err1.message?.includes('does not exist')) {
        console.warn('Notice deleting from travly_db:', err1.message);
      }
      if (err2 && !err2.message?.includes('does not exist')) {
        console.warn('Notice deleting from travly_backups:', err2.message);
      }
    } catch (err: any) {
      console.warn('Cloud delete notice:', err?.message || err);
    }
  }

  return true;
}

