import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, envNameToLabel } from './env';

export interface BuildMetadataSnapshot {
  version: string;
  commit: string;
  environment: string;
  timestamp: string;
  labels: {
    version: string;
    commit: string;
    environment: string;
    timestamp: string;
  };
}

const moduleDir = dirname(fileURLToPath(import.meta.url));

const resolveScriptPath = (): string => {
  const candidates = [
    resolve(process.cwd(), 'shared/scripts/collect-build-metadata.sh'),
    resolve(process.cwd(), '../shared/scripts/collect-build-metadata.sh'),
    resolve(process.cwd(), '../../shared/scripts/collect-build-metadata.sh'),
    resolve(moduleDir, '../../shared/scripts/collect-build-metadata.sh'),
    resolve(moduleDir, '../../../shared/scripts/collect-build-metadata.sh'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0]!;
};

const METADATA_SCRIPT_PATH = resolveScriptPath();

const DEFAULT_VERSION = '0.1.0-dev';
const DEFAULT_COMMIT = 'unknown';
const DEFAULT_TIMESTAMP = new Date(0).toISOString();

const formatTimestampLabel = (timestamp: string): string => {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 'Timestamp unavailable';
  }

  return `${timestamp} (${new Date(parsed).toUTCString()})`;
};

const toVersionLabel = (version: string) =>
  version ? `Version ${version}` : `Version ${DEFAULT_VERSION}`;

const toCommitLabel = (commit: string) =>
  commit.toLowerCase() === DEFAULT_COMMIT ? 'Unknown commit' : `Commit ${commit}`;

/**
 * Executes the shared metadata script. Returns undefined when execution fails,
 * allowing callers to gracefully fall back to defaults.
 */
type ScriptMetadata = Partial<Pick<BuildMetadataSnapshot, 'version' | 'commit' | 'timestamp'>>;

const executeMetadataScript = (): ScriptMetadata | null => {
  try {
    const buffer = execFileSync(METADATA_SCRIPT_PATH, ['--fallback-version', DEFAULT_VERSION]);
    const parsed = JSON.parse(buffer.toString('utf8')) as ScriptMetadata;
    return parsed;
  } catch {
    return null;
  }
};

export const loadBuildMetadata = (): Promise<BuildMetadataSnapshot> => {
  const result = executeMetadataScript() ?? {};
  const env = loadEnv();

  const version = result.version?.trim() || DEFAULT_VERSION;
  const commit = result.commit?.trim() || DEFAULT_COMMIT;
  const timestamp = result.timestamp?.trim() || DEFAULT_TIMESTAMP;
  const environment = env.NEXT_PUBLIC_APP_ENV ?? 'local';

  return Promise.resolve({
    version,
    commit,
    timestamp,
    environment,
    labels: {
      version: toVersionLabel(version),
      commit: toCommitLabel(commit),
      environment: envNameToLabel(environment),
      timestamp: formatTimestampLabel(timestamp),
    },
  });
};

export const metadataToAttributes = (
  metadata: BuildMetadataSnapshot,
): Record<string, string> => ({
  'data-app-version': metadata.version,
  'data-app-commit': metadata.commit,
  'data-app-environment': metadata.environment,
  'data-app-timestamp': metadata.timestamp,
});

export const buildMetadataAttributes = async (): Promise<Record<string, string>> =>
  metadataToAttributes(await loadBuildMetadata());
