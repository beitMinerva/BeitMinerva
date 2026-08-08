import { createClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'goatfarm_supabase_url';
const STORAGE_ANON_KEY = 'goatfarm_supabase_key';

export function getSupabaseCredentials() {
  const url = localStorage.getItem(STORAGE_URL_KEY) || '';
  const key = localStorage.getItem(STORAGE_ANON_KEY) || '';
  return { url, key };
}

export function saveSupabaseCredentials(url, key) {
  if (url) localStorage.setItem(STORAGE_URL_KEY, url.trim());
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (key) localStorage.setItem(STORAGE_ANON_KEY, key.trim());
  else localStorage.removeItem(STORAGE_ANON_KEY);
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key);
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}
