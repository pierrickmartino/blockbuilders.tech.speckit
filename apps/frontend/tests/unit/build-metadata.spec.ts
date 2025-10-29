import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileSync = vi.fn<Buffer, [string, string[]]>();

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
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
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

    const { loadBuildMetadata } = await import('../../lib/build-metadata');
    const snapshot = await loadBuildMetadata();

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
        version: '1.2.3',
        commit: 'abc1234',
        environment: 'ci',
        timestamp: '2024-05-01T12:00:00Z',
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

    const { loadBuildMetadata } = await import('../../lib/build-metadata');
    const snapshot = await loadBuildMetadata();

    expect(snapshot.environment).toBe('local');
    expect(snapshot.labels).toMatchObject({
      commit: 'Unknown commit',
      version: expect.stringContaining('0.1.0-dev'),
      environment: 'Local',
    });
    expect(snapshot.labels.timestamp).toMatch(/2024-05-01/);
  });
});
