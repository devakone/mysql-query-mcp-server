import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pools,
  credentialSources,
  credentialErrors,
  initializePools,
  resetPoolsForTesting,
} from '../../src/db/pools.js';
import { clearRegisteredSecrets } from '../../src/security/secrets.js';

/**
 * createPool does not open a connection, so these exercise real pool creation
 * without needing a database.
 */
describe('pool initialization with credential sources', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.keys(process.env).forEach((key) => {
      if (key.includes('_DB_')) delete process.env[key];
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    resetPoolsForTesting();
    clearRegisteredSecrets();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    resetPoolsForTesting();
    clearRegisteredSecrets();
  });

  function configure(prefix: string) {
    process.env[`${prefix}_DB_HOST`] = 'localhost';
    process.env[`${prefix}_DB_USER`] = 'mcp_user';
    process.env[`${prefix}_DB_NAME`] = 'app';
  }

  it('creates a pool from a resolved credential source', async () => {
    configure('LOCAL');
    process.env.LOCAL_DB_PASS_SOURCE = 'cmd:printf resolved-password';

    await initializePools();

    expect(pools.has('local')).toBe(true);
    expect(credentialSources.get('local')).toBe('cmd');
    expect(credentialErrors.has('local')).toBe(false);
  });

  it('still creates a pool from an inline password', async () => {
    configure('LOCAL');
    process.env.LOCAL_DB_PASS = 'inline-password';

    await initializePools();

    expect(pools.has('local')).toBe(true);
    expect(credentialSources.get('local')).toBe('env');
  });

  it('disables only the environment whose source failed', async () => {
    configure('LOCAL');
    process.env.LOCAL_DB_PASS = 'inline-password';

    configure('PRODUCTION');
    process.env.PRODUCTION_DB_PASS_SOURCE = 'cmd:exit 1';

    await initializePools();

    expect(pools.has('local')).toBe(true);
    expect(pools.has('production')).toBe(false);
    expect(credentialErrors.has('production')).toBe(true);
    expect(credentialSources.get('production')).toBe('cmd');
  });

  it('skips an environment with incomplete configuration', async () => {
    process.env.STAGING_DB_HOST = 'staging.example.com';
    process.env.STAGING_DB_PASS = 'staging-password';

    await initializePools();

    expect(pools.has('staging')).toBe(false);
    expect(credentialErrors.has('staging')).toBe(false);
  });

  it('is idempotent', async () => {
    configure('LOCAL');
    process.env.LOCAL_DB_PASS = 'inline-password';

    await initializePools();
    const first = pools.get('local');
    await initializePools();

    expect(pools.get('local')).toBe(first);
  });
});
