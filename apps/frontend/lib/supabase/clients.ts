import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { SupportedStorage } from '@supabase/supabase-js';

import type { SupabaseClient } from './types';
import {
  getBrowserSupabaseConfig,
  getServerSupabaseConfig,
} from './env';
import { createServerSupabaseCookies } from './cookies';
import type { CookieStoreAdapter } from './cookies';
import {
  getForwardableSupabaseHeaders,
  type HeaderInitType,
} from './headers';

type RequestCookieStore = Parameters<typeof createServerSupabaseCookies>[0];
export interface ServerClientContext {
  cookies: CookieStoreAdapter;
  headers?: HeaderInitType;
}

type GenericSupabaseClient = SupabaseClient<any, any, any, any, any>;

let browserClient: GenericSupabaseClient | null = null;
let serverClientCache = new WeakMap<RequestCookieStore, GenericSupabaseClient>();
let browserStorageMode: 'cookies' | 'memory' = 'cookies';
let browserStorage: SupportedStorage | null = null;

const createMemoryStorage = (): SupportedStorage => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};

const getBrowserStorage = (): SupportedStorage | null => {
  if (browserStorageMode === 'cookies') {
    return null;
  }
  if (!browserStorage) {
    browserStorage = createMemoryStorage();
  }
  return browserStorage;
};

export const getBrowserSupabaseClient = <Database = unknown>() => {
  if (browserClient) {
    return browserClient as SupabaseClient<Database>;
  }

  const { url, anonKey } = getBrowserSupabaseConfig();
  const storage = getBrowserStorage();
  const client = createBrowserClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      storage: storage ?? undefined,
      detectSessionInUrl: true,
    },
  });
  browserClient = client;
  return client;
};

export const createServerSupabaseClient = <Database = unknown>({
  cookies,
  headers,
}: ServerClientContext) => {
  const cachedClient = serverClientCache.get(cookies);
  if (cachedClient) {
    return cachedClient as SupabaseClient<Database>;
  }

  const { url, anonKey } = getServerSupabaseConfig();
  const headerRecord = getForwardableSupabaseHeaders(headers);
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: createServerSupabaseCookies(cookies),
    ...(headerRecord ? { global: { headers: headerRecord } } : {}),
  });

  serverClientCache.set(cookies, supabase);
  return supabase;
};

export const resetSupabaseClientCache = () => {
  browserClient = null;
  browserStorage = browserStorageMode === 'memory' ? createMemoryStorage() : null;
  serverClientCache = new WeakMap<RequestCookieStore, GenericSupabaseClient>();
};

export const setBrowserSupabaseStorageMode = (mode: 'cookies' | 'memory') => {
  if (browserStorageMode === mode) {
    return;
  }
  browserStorageMode = mode;
  browserStorage = mode === 'memory' ? createMemoryStorage() : null;
  resetSupabaseClientCache();
};
