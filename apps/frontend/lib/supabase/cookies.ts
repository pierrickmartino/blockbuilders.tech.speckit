import type { CookieMethodsServer } from '@supabase/ssr';

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

export interface SupabaseCookieAdapter extends CookieMethodsServer {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, attributes?: Partial<CookieAttributes>) => void;
  remove: (name: string, attributes?: Partial<CookieAttributes>) => void;
}

type CookieSetter =
  | ((
      name: string,
      value: string,
      attributes?: Partial<CookieAttributes>,
    ) => unknown)
  | ((
      cookie: {
        name: string;
        value: string;
      } & Partial<CookieAttributes>,
    ) => unknown);

export interface CookieStoreAdapter {
  get: (name: string) => { value: string } | undefined;
  getAll: () => Array<{ name: string; value: string }>;
  set?: CookieSetter;
}

type MiddlewareCookieStores = {
  request: {
    get: (name: string) => { value: string } | undefined;
    getAll: () => Array<{ name: string; value: string }>;
  };
  response: {
    set: CookieSetter;
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
  target: { set?: CookieSetter },
  name: string,
  value: string,
  options: CookieAttributes,
) => {
  if (typeof target.set !== 'function') {
    return;
  }

  const setter = target.set;
  const context = target;
  if (setter.length >= 2) {
    Reflect.apply(
      setter as (name: string, value: string, attributes: CookieAttributes) => unknown,
      context,
      [name, value, options],
    );
  } else {
    Reflect.apply(
      setter as (
        cookie: { name: string; value: string } & CookieAttributes,
      ) => unknown,
      context,
      [{ name, value, ...options }],
    );
  }
};

export const createServerSupabaseCookies = (
  cookieStore: CookieStoreAdapter,
): SupabaseCookieAdapter => {
  const listCookies = () => {
    try {
      return cookieStore.getAll();
    } catch {
      return [];
    }
  };

  const adapter: SupabaseCookieAdapter = {
    get: (name) => cookieStore.get(name)?.value,
    getAll: () =>
      listCookies().map(({ name, value }) => ({
        name,
        value,
      })),
    set: (name, value, overrides) => {
      const options = buildCookieOptions(overrides);
      callSet(cookieStore, name, value, options);
    },
    setAll: (cookies) => {
      cookies.forEach(({ name, value, options }) => {
        const resolvedOptions = buildCookieOptions(
          options as Partial<CookieAttributes> | undefined,
        );
        callSet(cookieStore, name, value, resolvedOptions);
      });
    },
    remove: (name, overrides) => {
      const options = buildRemovalOptions(overrides);
      callSet(cookieStore, name, '', options);
    },
  };

  return adapter;
};

export const createMiddlewareSupabaseCookies = ({
  request,
  response,
}: MiddlewareCookieStores): SupabaseCookieAdapter => {
  const localMutations = new Map<string, string | undefined>();
  const readRequestCookies = () => {
    try {
      return request.getAll();
    } catch {
      return [];
    }
  };

  const mergeCookies = () => {
    const merged = new Map<string, string>();
    readRequestCookies().forEach(({ name, value }) => {
      merged.set(name, value);
    });
    localMutations.forEach((value, name) => {
      if (value === undefined) {
        merged.delete(name);
      } else {
        merged.set(name, value);
      }
    });
    return Array.from(merged.entries()).map(([name, value]) => ({ name, value }));
  };

  return {
    get: (name) => {
      if (localMutations.has(name)) {
        return localMutations.get(name);
      }
      return request.get(name)?.value;
    },
    getAll: () => mergeCookies(),
    set: (name, value, overrides) => {
      const options = buildCookieOptions(overrides);
      callSet(response, name, value, options);
      localMutations.set(name, value);
    },
    setAll: (cookies) => {
      cookies.forEach(({ name, value, options }) => {
        const resolvedOptions = buildCookieOptions(
          options as Partial<CookieAttributes> | undefined,
        );
        callSet(response, name, value, resolvedOptions);
        localMutations.set(name, value);
      });
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
    getAll: () => Array<{ name: string; value: string }>;
    set?: CookieSetter;
  },
): CookieStoreAdapter => ({
  get: store.get.bind(store),
  getAll: store.getAll.bind(store),
  set:
    typeof store.set === 'function'
      ? store.set.bind(store)
      : undefined,
});
