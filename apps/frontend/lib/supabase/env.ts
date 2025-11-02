import { ZodError, z } from 'zod';

const SupabaseEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z
      .string({
        required_error: 'NEXT_PUBLIC_SUPABASE_URL is required.',
      })
      .trim()
      .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
      .string({
        required_error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.',
      })
      .trim()
      .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.'),
    SUPABASE_URL: z
      .string()
      .trim()
      .url('SUPABASE_URL must be a valid URL.')
      .optional(),
  })
  .transform((value) => ({
    ...value,
    NEXT_PUBLIC_SUPABASE_URL: value.NEXT_PUBLIC_SUPABASE_URL.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: value.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim(),
    SUPABASE_URL: value.SUPABASE_URL?.trim(),
  }));

type SupabaseEnv = z.infer<typeof SupabaseEnvSchema>;

export type BrowserSupabaseConfig = {
  url: string;
  anonKey: string;
};

export type ServerSupabaseConfig = {
  url: string;
  anonKey: string;
};

let cachedEnv: SupabaseEnv | null = null;
let cachedBrowserConfig: BrowserSupabaseConfig | null = null;
let cachedServerConfig: ServerSupabaseConfig | null = null;

const FALLBACK_SUPABASE_URL = 'http://localhost:54321';
const FALLBACK_SUPABASE_ANON_KEY = 'local-test-anon-key-placeholder';

const getValidatedEnv = (): SupabaseEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    const parsedEnv = SupabaseEnvSchema.parse(process.env);
    cachedEnv = parsedEnv;
    return parsedEnv;
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction || !(error instanceof ZodError)) {
      throw error;
    }

    const requiredKeys: Array<keyof SupabaseEnv> = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];
    const shouldUseFallback = requiredKeys.every(
      (key) => process.env[key] === undefined,
    );

    if (!shouldUseFallback) {
      throw error;
    }

    const fallbackEnv = SupabaseEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: FALLBACK_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: FALLBACK_SUPABASE_ANON_KEY,
      SUPABASE_URL: FALLBACK_SUPABASE_URL,
    });

    cachedEnv = fallbackEnv;
    return fallbackEnv;
  }
};

export const getBrowserSupabaseConfig = (): BrowserSupabaseConfig => {
  if (cachedBrowserConfig) {
    return cachedBrowserConfig;
  }

  const env = getValidatedEnv();
  cachedBrowserConfig = {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  return cachedBrowserConfig;
};

export const getServerSupabaseConfig = (): ServerSupabaseConfig => {
  if (cachedServerConfig) {
    return cachedServerConfig;
  }

  const env = getValidatedEnv();
  cachedServerConfig = {
    url: env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  return cachedServerConfig;
};

export const resetSupabaseEnvCache = () => {
  cachedEnv = null;
  cachedBrowserConfig = null;
  cachedServerConfig = null;
};
