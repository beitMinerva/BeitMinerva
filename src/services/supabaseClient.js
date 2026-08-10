import { createClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'goatfarm_supabase_url';
const STORAGE_ANON_KEY = 'goatfarm_supabase_key';

const DEFAULT_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://tlneqawnaifeipudbwjq.supabase.co';

const DEFAULT_SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'sb_publishable_HtzmJ9d-NTPVUfUByceSbw_PtajHP1A';

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey };
  }

  const url = localStorage.getItem(STORAGE_URL_KEY) || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem(STORAGE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

export function saveSupabaseCredentials(url, key) {
  if (url) localStorage.setItem(STORAGE_URL_KEY, url.trim());
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (key) localStorage.setItem(STORAGE_ANON_KEY, key.trim());
  else localStorage.removeItem(STORAGE_ANON_KEY);

  resetSupabaseClient();
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

let supabaseInstance = null;
let currentInstanceUrl = null;

export function getSupabase() {
  const { url, key } = getSupabaseCredentials();
  const finalUrl = url || DEFAULT_SUPABASE_URL;
  const finalKey = key || DEFAULT_SUPABASE_ANON_KEY;

  if (!supabaseInstance || currentInstanceUrl !== finalUrl) {
    try {
      supabaseInstance = createClient(finalUrl, finalKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce'
        }
      });
      currentInstanceUrl = finalUrl;
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
