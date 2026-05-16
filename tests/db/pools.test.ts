import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildPoolOptions, DEFAULT_MYSQL_TIMEZONE } from '../../src/db/options.js';

const createPool = vi.fn((config) => ({ config }));

vi.mock('mysql2/promise', () => ({
  createPool,
}));

describe('database pool options', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    Object.keys(process.env).forEach((key) => {
      if (key.includes('_DB_') || key.startsWith('MCP_MYSQL_') || key === 'MYSQL_TIMEZONE') {
        delete process.env[key];
      }
    });

    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns date/time values as raw strings and defaults connection timezone to UTC', () => {
    process.env.LOCAL_DB_HOST = 'localhost';
    process.env.LOCAL_DB_USER = 'root';
    process.env.LOCAL_DB_PASS = 'password';
    process.env.LOCAL_DB_NAME = 'test';

    const options = buildPoolOptions('LOCAL');

    expect(options.dateStrings).toBe(true);
    expect(options.timezone).toBe(DEFAULT_MYSQL_TIMEZONE);
  });

  it('allows the mysql timezone to be overridden', () => {
    process.env.MYSQL_TIMEZONE = '+00:00';

    const options = buildPoolOptions('LOCAL');

    expect(options.timezone).toBe('+00:00');
  });

  it('passes a configured custom port to mysql2 pool options', () => {
    process.env.LOCAL_DB_PORT = '3307';

    const options = buildPoolOptions('LOCAL');

    expect(options.port).toBe(3307);
  });

  it('does not initialize pools more than once', async () => {
    process.env.LOCAL_DB_HOST = 'localhost';
    process.env.LOCAL_DB_USER = 'root';
    process.env.LOCAL_DB_PASS = 'password';
    process.env.LOCAL_DB_NAME = 'testdb';

    const { initializePools } = await import('../../src/db/pools.js');

    initializePools();
    initializePools();

    expect(createPool).toHaveBeenCalledTimes(1);
  });
});
