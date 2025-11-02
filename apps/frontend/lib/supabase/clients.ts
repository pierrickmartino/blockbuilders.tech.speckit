import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { SupportedStorage } from '@supabase/supabase-js';

import type { SupabaseClient } from './types';
import {
  getBrowserSupabaseConfig,
  getServerSupabaseConfig,
} from './env';
import { createServerSupabaseCookies } from './cookies';
import type { CookieStoreAdapter } from './cookies';

type RequestCookieStore = Parameters<typeof createServerSupabaseCookies>[0];
type HeaderInit = ConstructorParameters<typeof Headers>[0];

export interface ServerClientContext {
  cookies: CookieStoreAdapter;
  headers?: HeaderInit;
}

let browserClient: SupabaseClient<unknown> | null = null;
let serverClientCache = new WeakMap<
  RequestCookieStore,
  SupabaseClient<unknown>
>();
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

const isHeadersInstance = (input: HeaderInit): input is Headers =>
  typeof Headers !== 'undefined' && input instanceof Headers;

const toHeaderRecord = (
  input?: HeaderInit,
): Record<string, string> | undefined => {
  if (!input) {
    return undefined;
  }

  if (isHeadersInstance(input)) {
    return Object.fromEntries(input.entries());
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input);
  }

  return Object.fromEntries(Object.entries(input));
};

export const getBrowserSupabaseClient = <Database = unknown>(): SupabaseClient<Database> => {
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
  browserClient = client as SupabaseClient<unknown>;
  return client;
};

export const createServerSupabaseClient = <Database = unknown>({
  cookies,
  headers,
}: ServerClientContext): SupabaseClient<Database> => {
  const cachedClient = serverClientCache.get(cookies);
  if (cachedClient) {
    return cachedClient as SupabaseClient<Database>;
  }

  const { url, anonKey } = getServerSupabaseConfig();
  const headerRecord = toHeaderRecord(headers);
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: createServerSupabaseCookies(cookies),
    ...(headerRecord ? { global: { headers: headerRecord } } : {}),
  });

  serverClientCache.set(cookies, supabase as SupabaseClient<unknown>);
  return supabase;
};

export const resetSupabaseClientCache = () => {
  browserClient = null;
  browserStorage = browserStorageMode === 'memory' ? createMemoryStorage() : null;
  serverClientCache = new WeakMap<
    RequestCookieStore,
    SupabaseClient<unknown>
  >();
};

export const setBrowserSupabaseStorageMode = (mode: 'cookies' | 'memory') => {
  if (browserStorageMode === mode) {
    return;
  }
  browserStorageMode = mode;
  browserStorage = mode === 'memory' ? createMemoryStorage() : null;
  resetSupabaseClientCache();
};
