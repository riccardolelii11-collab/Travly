/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppDatabase } from '../types';

const STORAGE_URL_KEY = 'travly_supabase_url';
const STORAGE_ANON_KEY = 'travly_supabase_anon_key';

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  // Basic URL validation to ensure it's a valid http/https URL before attempting client creation
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { url: '', anonKey: '' };
      }
    } catch {
      return { url: '', anonKey: '' };
    }
  }

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (url) {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
  }

  if (anonKey) {
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
  id text primary key default 'main',
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) or add public policy
alter table travly_db enable row level security;

-- Policies for anon access (if not using auth)
drop policy if exists "Public select" on travly_db;
create policy "Public select" on travly_db for select using (true);

drop policy if exists "Public insert" on travly_db;
create policy "Public insert" on travly_db for insert with check (true);

drop policy if exists "Public update" on travly_db;
create policy "Public update" on travly_db for update using (true);
`;

export async function loadFromSupabase(): Promise<AppDatabase | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('travly_db')
      .select('data')
      .eq('id', 'main')
      .single();

    if (error) {
      if (
        error.code === 'PGRST116' ||
        error.code === 'PGRST204' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist')
      ) {
        // Table or record not found yet in Supabase
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

export async function saveToSupabase(db: AppDatabase): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('travly_db')
      .upsert({
        id: 'main',
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
