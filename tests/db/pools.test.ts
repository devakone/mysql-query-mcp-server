import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildPoolOptions, DEFAULT_MYSQL_TIMEZONE } from '../../src/db/options.js';

describe('database pool options', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
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
});
