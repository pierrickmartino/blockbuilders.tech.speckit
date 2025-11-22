/**
 * Next.js middleware runs inside the Web runtime which forbids mutating most
 * request headers on outbound fetch calls. Supabase only needs a handful of
 * forwarding headers for IP + protocol awareness, so we aggressively
 * filter/normalize the header set before handing it to the Supabase client.
 */
export type HeaderInitType = ConstructorParameters<typeof Headers>[0];

const SUPABASE_HEADER_ALLOWLIST = new Set([
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'forwarded',
]);

const toHeaderEntries = (input: HeaderInitType): Array<[string, string]> => {
  if (input instanceof Headers) {
    return Array.from(input.entries());
  }

  if (Array.isArray(input)) {
    return input.map(([key, value]) => [String(key), String(value)]);
  }

  return Object.entries(input ?? {});
};

export const getForwardableSupabaseHeaders = (
  input?: HeaderInitType,
): Record<string, string> | undefined => {
  if (!input) {
    return undefined;
  }

  const filtered = new Map<string, string>();
  for (const [key, value] of toHeaderEntries(input)) {
    const normalizedKey = key.trim().toLowerCase();
    if (!SUPABASE_HEADER_ALLOWLIST.has(normalizedKey)) {
      continue;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      continue;
    }
    filtered.set(normalizedKey, normalizedValue);
  }

  if (filtered.size === 0) {
    return undefined;
  }

  return Object.fromEntries(filtered.entries());
};
