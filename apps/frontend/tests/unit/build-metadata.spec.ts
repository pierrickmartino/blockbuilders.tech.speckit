import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as BuildMetadataModule from '../../lib/build-metadata';

const execFileSync = vi.fn<(scriptPath: string, args: string[]) => Buffer>();

vi.mock('node:child_process', () => ({
  execFileSync,
}));

const encodeScriptOutput = (payload: unknown) =>
  Buffer.from(JSON.stringify(payload), 'utf8');

describe('loadBuildMetadata', () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSync.mockReset();
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.PLAYWRIGHT_EXPECT_UNKNOWN_COMMIT;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.PLAYWRIGHT_EXPECT_UNKNOWN_COMMIT;
  });

  it('parses the shared build snapshot and annotates the runtime environment', async () => {
    execFileSync.mockReturnValueOnce(
      encodeScriptOutput({
        version: '1.2.3',
        commit: 'abc1234',
        timestamp: '2024-05-01T12:00:00Z',
      }),
    );
    process.env.NEXT_PUBLIC_APP_ENV = 'ci';

    const module = await vi.importActual<typeof BuildMetadataModule>(
      '../../lib/build-metadata',
    );
    const snapshot: BuildMetadataModule.BuildMetadataSnapshot =
      await module.loadBuildMetadata();

    expect(execFileSync).toHaveBeenCalledWith(
      expect.stringContaining('collect-build-metadata.sh'),
      expect.any(Array),
    );

    expect(snapshot).toMatchObject({
      version: '1.2.3',
      commit: 'abc1234',
      environment: 'ci',
      timestamp: '2024-05-01T12:00:00Z',
      labels: {
        version: 'Version 1.2.3',
        commit: 'Commit abc1234',
        environment: 'Continuous Integration',
        timestamp: '2024-05-01T12:00:00Z (Wed, 01 May 2024 12:00:00 GMT)',
      },
    });
  });

  it('applies default labels when git metadata is unavailable', async () => {
    execFileSync.mockReturnValueOnce(
      encodeScriptOutput({
        version: '0.1.0-dev',
        commit: 'unknown',
        timestamp: '2024-05-01T12:00:00Z',
      }),
    );

    const module = await vi.importActual<typeof BuildMetadataModule>(
      '../../lib/build-metadata',
    );
    const snapshot: BuildMetadataModule.BuildMetadataSnapshot =
      await module.loadBuildMetadata();

    expect(snapshot.environment).toBe('local');
    expect(snapshot.labels.commit).toBe('Unknown commit');
    expect(snapshot.labels.version).toContain('0.1.0-dev');
    expect(snapshot.labels.environment).toBe('Local');
    expect(snapshot.labels.timestamp).toMatch(/2024-05-01/);
  });

  it('forces fallback values when instructed via options', async () => {
    const module = await vi.importActual<typeof BuildMetadataModule>(
      '../../lib/build-metadata',
    );

    const snapshot = await module.loadBuildMetadata({ forceFallback: true });

    expect(execFileSync).not.toHaveBeenCalled();
    expect(snapshot.commit).toBe('unknown');
    expect(snapshot.labels.commit).toBe('Unknown commit');
  });

  it('forces fallback values when the environment flag is present', async () => {
    process.env.PLAYWRIGHT_EXPECT_UNKNOWN_COMMIT = '1';

    const module = await vi.importActual<typeof BuildMetadataModule>(
      '../../lib/build-metadata',
    );

    const snapshot = await module.loadBuildMetadata();

    expect(execFileSync).not.toHaveBeenCalled();
    expect(snapshot.commit).toBe('unknown');
    expect(snapshot.labels.commit).toBe('Unknown commit');
  });
});
