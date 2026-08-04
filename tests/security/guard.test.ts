import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { guardToolResponse, SecretLeakError } from '../../src/security/guard.js';
import { scanForSecrets, redact } from '../../src/security/secrets.js';

/**
 * These tests are the regression net for the credential-leak class of bug. The
 * point is not to prove the current tools are clean (the per-tool tests do
 * that), it is to prove that a future response carrying a secret gets stopped
 * even if nobody remembers this file exists.
 */

function response(payload: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

describe('tool response guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.keys(process.env).forEach((key) => {
      if (key.includes('_DB_')) delete process.env[key];
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('passes a response that describes capability only', () => {
    process.env.PRODUCTION_DB_PASS = 'super-secret-prod-password';

    const safe = response({
      environments: [{ name: 'production', credentialSource: 'env' }],
      count: 1,
    });

    expect(() => guardToolResponse('environments', safe)).not.toThrow();
  });

  it('blocks the exact bug that shipped: an env var dump', () => {
    process.env.PRODUCTION_DB_HOST = 'prod.example.com';
    process.env.PRODUCTION_DB_USER = 'mcp_user';
    process.env.PRODUCTION_DB_PASS = 'super-secret-prod-password';

    const leaky = response({
      environments: ['production'],
      debug: {
        envVars: {
          PRODUCTION_DB_HOST: process.env.PRODUCTION_DB_HOST,
          PRODUCTION_DB_USER: process.env.PRODUCTION_DB_USER,
          PRODUCTION_DB_PASS: process.env.PRODUCTION_DB_PASS,
        },
      },
    });

    expect(() => guardToolResponse('environments', leaky)).toThrow(SecretLeakError);
  });

  it('blocks a password value even when the field is named innocently', () => {
    process.env.STAGING_DB_PASS = 'staging-password-value';

    const leaky = response({ notes: 'connected using staging-password-value' });

    expect(() => guardToolResponse('info', leaky)).toThrow(SecretLeakError);
  });

  it('blocks a configuration-shaped key even when the value is not a known secret', () => {
    const leaky = response({ config: { DEVELOPMENT_DB_HOST: 'dev.example.com' } });

    expect(() => guardToolResponse('environments', leaky)).toThrow(SecretLeakError);
  });

  it('names the rules that fired without repeating the secret', () => {
    process.env.PRODUCTION_DB_PASS = 'super-secret-prod-password';

    const leaky = response({ password: process.env.PRODUCTION_DB_PASS });

    try {
      guardToolResponse('environments', leaky);
      expect.unreachable('guard should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SecretLeakError);
      const leak = error as SecretLeakError;
      expect(leak.rules).toContain('env-secret-value');
      expect(leak.message).not.toContain('super-secret-prod-password');
    }
  });

  it('fails closed rather than scrubbing and forwarding', () => {
    process.env.LOCAL_DB_PASS = 'local-password-value';

    const leaky = response({ value: 'local-password-value' });

    expect(() => guardToolResponse('query', leaky)).toThrow();
  });
});

describe('secret shape detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.keys(process.env).forEach((key) => {
      if (key.includes('_DB_')) delete process.env[key];
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it.each([
    ['an AWS access key id', 'AKIAIOSFODNN7EXAMPLE'],
    ['a MySQL connection URI with a password', 'mysql://root:hunter2@db.example.com:3306/app'],
    ['a private key block', '-----BEGIN RSA PRIVATE KEY-----\nMIIEow==\n'],
    ['a GitHub token', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'],
  ])('detects %s', (_label, payload) => {
    expect(scanForSecrets(payload).length).toBeGreaterThan(0);
  });

  it.each([
    ['a column literally named password', '{"rows":[{"password_hash":"$2b$10$abcdefghijklmno"}]}'],
    ['a username in a data row', '{"rows":[{"user":"admin","host":"prod.example.com"}]}'],
    ['ordinary query output', '{"rows":[{"id":1,"email":"a@b.com"}],"rowCount":1}'],
  ])('does not false-positive on %s', (_label, payload) => {
    expect(scanForSecrets(payload)).toEqual([]);
  });
});

describe('log redaction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('replaces secret values in log lines', () => {
    process.env.PRODUCTION_DB_PASS = 'super-secret-prod-password';

    const line = redact('connecting with super-secret-prod-password');

    expect(line).not.toContain('super-secret-prod-password');
    expect(line).toContain('[REDACTED:PRODUCTION_DB_PASS]');
  });
});
