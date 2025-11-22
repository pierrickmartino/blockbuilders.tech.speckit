import { cache } from 'react';

const STATUS_API_BASE_URL = process.env.STATUS_API_BASE_URL ?? 'http://localhost:8000';

type Interval = 'minute' | 'day';
type VendorState = 'up' | 'degraded' | 'down' | 'rate_limited';
type AssetState = 'healthy' | 'stale' | 'gap_detected';
type IssueType = 'gap' | 'duplicate' | 'checksum_mismatch' | 'partial_source';

type IsoDate = string;

export interface AssetStatus {
  asset: string;
  interval: Interval;
  coverage_start: IsoDate;
  coverage_end: IsoDate;
  latest_timestamp: IsoDate;
  freshness_minutes: number;
  status: AssetState;
  vendor_status: VendorState;
}

export interface RemediationEntry {
  id: string;
  asset_symbol: string;
  interval: Interval;
  issue_type: IssueType;
  range_start: IsoDate;
  range_end: IsoDate;
  detected_at: IsoDate;
  resolved: boolean;
  resolved_at?: IsoDate | null;
  run_id?: string | null;
  notes?: string | null;
}

export interface LineageEntry {
  asset_symbol: string;
  bucket_start: IsoDate;
  interval: Interval;
  run_id: string;
  source_vendor: string;
  fetched_at: IsoDate;
  checksum_sha256: string;
  checksum_version: number;
}

export interface StatusSummaryResponse {
  assets: AssetStatus[];
}

export interface RemediationResponse {
  items: RemediationEntry[];
}

export interface LineageResponse {
  items: LineageEntry[];
}

interface RequestInitish extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
}

const buildUrl = (path: string, searchParams?: RequestInitish['searchParams']): URL => {
  const url = new URL(path, STATUS_API_BASE_URL);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url;
};

async function request<T>(path: string, init?: RequestInitish): Promise<T> {
  const url = buildUrl(path, init?.searchParams);
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = response.statusText || `Status API request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const fetchStatusSummary = cache(async (
  params: { onlyStale?: boolean; signal?: AbortSignal } = {},
): Promise<StatusSummaryResponse> => {
  const { onlyStale = false, signal } = params;
  return request<StatusSummaryResponse>('/status/summary', {
    signal,
    searchParams: { only_stale: onlyStale },
  });
});

export async function fetchRemediation(
  params: { asset?: string; issueType?: IssueType; signal?: AbortSignal } = {},
): Promise<RemediationResponse> {
  const { asset, issueType, signal } = params;
  return request<RemediationResponse>('/status/remediation', {
    signal,
    searchParams: { asset, issue_type: issueType },
  });
}

export async function fetchLineage(params: {
  asset: string;
  start: Date | string;
  end: Date | string;
  interval: Interval;
  signal?: AbortSignal;
}): Promise<LineageResponse> {
  const { asset, start, end, interval, signal } = params;
  const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);
  return request<LineageResponse>('/lineage', {
    signal,
    searchParams: {
      asset,
      start: toIso(start),
      end: toIso(end),
      interval,
    },
  });
}

export const statusClient = {
  fetchStatusSummary,
  fetchRemediation,
  fetchLineage,
};
