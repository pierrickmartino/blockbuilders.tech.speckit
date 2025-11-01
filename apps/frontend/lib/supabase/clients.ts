import { createBrowserClient, createServerClient } from '@supabase/ssr';

import type { SupabaseClient } from './types';
import {
  getBrowserSupabaseConfig,
  getServerSupabaseConfig,
} from './env';
import { createServerSupabaseCookies } from './cookies';

type RequestCookieStore = Parameters<typeof createServerSupabaseCookies>[0];

export interface ServerClientContext {
  cookies: RequestCookieStore;
  headers: Headers;
}

let browserClient: SupabaseClient | null = null;
let serverClientCache = new WeakMap<RequestCookieStore, SupabaseClient>();

export const getBrowserSupabaseClient = <Database = unknown>(): SupabaseClient<Database> => {
  if (browserClient) {
    return browserClient as SupabaseClient<Database>;
  }

  const { url, anonKey } = getBrowserSupabaseConfig();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient as SupabaseClient<Database>;
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
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: createServerSupabaseCookies(cookies),
    headers,
  });

  serverClientCache.set(cookies, supabase as SupabaseClient);
  return supabase;
};

export const resetSupabaseClientCache = () => {
  browserClient = null;
  serverClientCache = new WeakMap();
};
