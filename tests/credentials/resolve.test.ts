import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseReference, resolvePassword, CREDENTIAL_SCHEMES } from '../../src/credentials/index.js';
import { clearRegisteredSecrets, scanForSecrets } from '../../src/security/secrets.js';

describe('credential reference parsing', () => {
  it.each([
    ['keychain:production', 'keychain', 'production'],
    ['keychain://mysql-query-mcp/production', 'keychain', 'mysql-query-mcp/production'],
    ['cmd:op read op://Infra/db/password', 'cmd', 'op read op://Infra/db/password'],
    ['aws-secrets://prod/mysql#password', 'aws-secrets', 'prod/mysql#password'],
    ['aws-ssm:///prod/mysql/password', 'aws-ssm', '/prod/mysql/password'],
    ['env:OTHER_VAR', 'env', 'OTHER_VAR'],
  ])('parses %s', (input, scheme, target) => {
    expect(parseReference(input)).toEqual({ scheme, target });
  });

  it('returns null when there is no scheme', () => {
    expect(parseReference('just-a-password')).toBeNull();
  });

  it('exposes the supported schemes', () => {
    expect(CREDENTIAL_SCHEMES).toEqual(
      expect.arrayContaining(['env', 'cmd', 'keychain', 'aws-secrets', 'aws-ssm']),
    );
  });
});

describe('password resolution', () => {
  const originalEnv = process.env;
  let warnings: string[];

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.keys(process.env).forEach((key) => {
      if (key.includes('_DB_')) delete process.env[key];
    });

    warnings = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => {
      warnings.push(String(chunk));
      return true;
    });
    clearRegisteredSecrets();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    clearRegisteredSecrets();
  });

  it('reports source "none" when nothing is configured', async () => {
    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });
    expect(result).toEqual({ source: 'none' });
  });

  it('uses the inline password when only _DB_PASS is set', async () => {
    process.env.LOCAL_DB_PASS = 'local-password';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result).toEqual({ password: 'local-password', source: 'env' });
  });

  it('does not warn about a plaintext password for local', async () => {
    process.env.LOCAL_DB_PASS = 'local-password';

    await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(warnings.join('')).not.toContain('plaintext');
  });

  it('warns when production uses a plaintext password', async () => {
    process.env.PRODUCTION_DB_PASS = 'prod-password';

    const result = await resolvePassword({ environment: 'production', envPrefix: 'PRODUCTION' });

    expect(result.password).toBe('prod-password');
    expect(warnings.join('')).toContain('plaintext password');
    expect(warnings.join('')).toContain('PRODUCTION_DB_PASS_SOURCE');
  });

  it('never puts the password itself in the warning', async () => {
    process.env.PRODUCTION_DB_PASS = 'prod-password-value';

    await resolvePassword({ environment: 'production', envPrefix: 'PRODUCTION' });

    expect(warnings.join('')).not.toContain('prod-password-value');
  });

  it('resolves through a command source', async () => {
    process.env.STAGING_DB_PASS_SOURCE = 'cmd:printf resolved-from-command';

    const result = await resolvePassword({ environment: 'staging', envPrefix: 'STAGING' });

    expect(result).toEqual({ password: 'resolved-from-command', source: 'cmd' });
  });

  it('strips only the trailing newline from command output', async () => {
    process.env.STAGING_DB_SOURCE_UNUSED = 'x';
    process.env.STAGING_DB_PASS_SOURCE = "cmd:printf 'pass word\\n'";

    const result = await resolvePassword({ environment: 'staging', envPrefix: 'STAGING' });

    expect(result.password).toBe('pass word');
  });

  it('resolves through an env indirection source', async () => {
    process.env.SOME_OTHER_SECRET = 'indirect-value';
    process.env.LOCAL_DB_PASS_SOURCE = 'env:SOME_OTHER_SECRET';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result).toEqual({ password: 'indirect-value', source: 'env' });
  });

  it('prefers _DB_PASS_SOURCE over _DB_PASS and warns about the overlap', async () => {
    process.env.LOCAL_DB_PASS = 'inline-password';
    process.env.LOCAL_DB_PASS_SOURCE = 'cmd:printf from-source';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result.password).toBe('from-source');
    expect(warnings.join('')).toContain('both LOCAL_DB_PASS and LOCAL_DB_PASS_SOURCE are set');
  });

  it('reports an unknown scheme without throwing', async () => {
    process.env.LOCAL_DB_PASS_SOURCE = 'vault-of-mystery:some/path';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result.password).toBeUndefined();
    expect(result.source).toBe('invalid');
    expect(result.error).toContain('unknown credential source');
  });

  it('reports a missing scheme without throwing', async () => {
    process.env.LOCAL_DB_PASS_SOURCE = 'oops-just-a-value';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result.source).toBe('invalid');
    expect(result.error).toContain('no scheme');
  });

  it('reports a failing source without throwing, so other environments survive', async () => {
    process.env.PRODUCTION_DB_PASS_SOURCE = 'cmd:exit 3';

    const result = await resolvePassword({ environment: 'production', envPrefix: 'PRODUCTION' });

    expect(result.password).toBeUndefined();
    expect(result.source).toBe('cmd');
    expect(result.error).toBeTruthy();
  });

  it('treats an empty resolved value as a failure', async () => {
    process.env.LOCAL_DB_PASS_SOURCE = 'cmd:printf ""';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result.password).toBeUndefined();
    expect(result.error).toContain('empty value');
  });

  it('registers a resolved password so the response guard can still catch it', async () => {
    process.env.LOCAL_DB_PASS_SOURCE = 'cmd:printf secret-from-keychain';

    await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    // The password is not in process.env, so without registration the guard
    // would have no way to know it is a secret.
    const findings = scanForSecrets('{"leaked":"secret-from-keychain"}');
    expect(findings.map((finding) => finding.rule)).toContain('env-secret-value');
  });

  it('reports the AWS alternative when the SDK is absent', async () => {
    process.env.LOCAL_DB_PASS_SOURCE = 'aws-secrets://prod/mysql#password';

    const result = await resolvePassword({ environment: 'local', envPrefix: 'LOCAL' });

    expect(result.source).toBe('aws-secrets');
    expect(result.error).toContain('@aws-sdk/client-secrets-manager');
    expect(result.error).toContain('aws secretsmanager get-secret-value');
  });
});
