export const SUPABASE_ACCESS_TOKEN_COOKIE = 'sb-access-token';
export const SUPABASE_REFRESH_TOKEN_COOKIE = 'sb-refresh-token';

export type CookieSameSite = 'lax' | 'strict' | 'none';

export interface CookieAttributes {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: CookieSameSite;
  secure?: boolean;
}

export interface SupabaseCookieAdapter {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, attributes?: Partial<CookieAttributes>) => void;
  remove: (name: string, attributes?: Partial<CookieAttributes>) => void;
}

export interface CookieStoreAdapter {
  get: (name: string) => { value: string } | undefined;
  set?: (...args: any[]) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
}

type MiddlewareCookieStores = {
  request: {
    get: (name: string) => { value: string } | undefined;
  };
  response: {
    set: (...args: unknown[]) => unknown;
  };
};

const BASE_COOKIE_OPTIONS: CookieAttributes = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const buildCookieOptions = (
  overrides?: Partial<CookieAttributes>,
): CookieAttributes => ({
  ...BASE_COOKIE_OPTIONS,
  ...overrides,
  // Ensure secure flag respects runtime changes to NODE_ENV (use latest value).
  secure:
    overrides?.secure ?? (process.env.NODE_ENV === 'production' ? true : false),
});

const buildRemovalOptions = (
  overrides?: Partial<CookieAttributes>,
): CookieAttributes => ({
  ...buildCookieOptions(overrides),
  maxAge: 0,
  expires: overrides?.expires ?? new Date(0),
});

const callSet = (
  target: { set?: (...args: any[]) => unknown }, // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string,
  value: string,
  options: CookieAttributes,
) => {
  if (typeof target.set !== 'function') {
    return;
  }

  if (target.set.length >= 2) {
    target.set(name, value, options);
  } else {
    target.set({ name, value, ...options });
  }
};

export const createServerSupabaseCookies = (
  cookieStore: CookieStoreAdapter,
): SupabaseCookieAdapter => ({
  get: (name) => cookieStore.get(name)?.value,
  set: (name, value, overrides) => {
    const options = buildCookieOptions(overrides);
    callSet(cookieStore, name, value, options);
  },
  remove: (name, overrides) => {
    const options = buildRemovalOptions(overrides);
    callSet(cookieStore, name, '', options);
  },
});

export const createMiddlewareSupabaseCookies = ({
  request,
  response,
}: MiddlewareCookieStores): SupabaseCookieAdapter => {
  const localMutations = new Map<string, string | undefined>();

  return {
    get: (name) => {
      if (localMutations.has(name)) {
        return localMutations.get(name);
      }
      return request.get(name)?.value;
    },
    set: (name, value, overrides) => {
      const options = buildCookieOptions(overrides);
      callSet(response, name, value, options);
      localMutations.set(name, value);
    },
    remove: (name, overrides) => {
      const options = buildRemovalOptions(overrides);
      callSet(response, name, '', options);
      localMutations.set(name, undefined);
    },
  };
};

export const adaptToCookieStore = (
  store: {
    get: (name: string) => { value: string } | undefined;
    set?: (...args: any[]) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
  },
): CookieStoreAdapter => ({
  get: (name) => store.get(name),
  set: typeof store.set === 'function' ? (...args: any[]) => store.set!(...args) : undefined,
});
