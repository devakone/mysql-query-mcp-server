import type { CredentialResolver } from "./types.js";

/**
 * AWS-backed credential sources.
 *
 * The SDK clients are loaded on demand and are not bundled, so the base install
 * stays pure JavaScript for the majority of users who do not need them. Both use
 * the caller's existing credential chain (environment, shared config, SSO,
 * instance or task role), so this introduces no new secret to manage.
 */

/**
 * The SDK packages are not declared as dependencies, optional or otherwise.
 * They add roughly 11 MB, which is a poor trade for every user when the cmd:
 * source already covers AWS through the AWS CLI with no dependency at all.
 *
 * The specifier is held in a variable so that TypeScript does not try to
 * resolve a package that is intentionally absent from this project.
 */
const SECRETS_MANAGER_PACKAGE = '@aws-sdk/client-secrets-manager';
const SSM_PACKAGE = '@aws-sdk/client-ssm';

function missingDependency(packageName: string, alternative: string, cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(
    `${packageName} is not installed, so this source cannot be used. Either install it ` +
      `alongside this server (npm install -g mysql-query-mcp-server ${packageName}), or use ` +
      `the cmd: source with the AWS CLI, which needs no extra package:\n  ${alternative}\n` +
      `(${detail})`,
  );
}

/**
 * `aws-secrets://<secret-id>[#json-key]`
 *
 * Without a fragment the whole secret string is the password. With one, the
 * secret is parsed as JSON and that key is read, which matches the shape RDS
 * writes when it manages a secret ({"username":...,"password":...}).
 */
export const resolveFromSecretsManager: CredentialResolver = async (reference) => {
  const [secretId, jsonKey] = splitFragment(reference);

  if (!secretId) {
    throw new Error('no secret id given, expected aws-secrets://<secret-id>[#json-key]');
  }

  let SecretsManagerClient: any;
  let GetSecretValueCommand: any;
  try {
    ({ SecretsManagerClient, GetSecretValueCommand } = await import(SECRETS_MANAGER_PACKAGE));
  } catch (error) {
    throw missingDependency(
      SECRETS_MANAGER_PACKAGE,
      `cmd:aws secretsmanager get-secret-value --secret-id ${secretId} ` +
        `--query SecretString --output text`,
      error,
    );
  }

  const client = new SecretsManagerClient({});
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  const secretString: string | undefined = response.SecretString;

  if (!secretString) {
    throw new Error(`secret "${secretId}" has no string value (binary secrets are not supported)`);
  }

  if (!jsonKey) {
    return secretString;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(secretString);
  } catch {
    throw new Error(
      `secret "${secretId}" is not JSON, so the #${jsonKey} key cannot be read. ` +
        `Drop the fragment to use the whole value`,
    );
  }

  const value = parsed[jsonKey];
  if (typeof value !== 'string' || !value) {
    throw new Error(`secret "${secretId}" has no string value at key "${jsonKey}"`);
  }

  return value;
};

/**
 * `aws-ssm://<parameter-name>`
 *
 * Parameter names start with `/`, which survives stripping the scheme's `//`,
 * so `aws-ssm:///prod/mysql/password` and `aws-ssm://prod/mysql/password` both
 * resolve to `/prod/mysql/password`.
 */
export const resolveFromParameterStore: CredentialResolver = async (reference) => {
  const [rawName] = splitFragment(reference);
  const name = rawName.startsWith('/') ? rawName : `/${rawName}`;

  if (name === '/') {
    throw new Error('no parameter name given, expected aws-ssm://<parameter-name>');
  }

  let SSMClient: any;
  let GetParameterCommand: any;
  try {
    ({ SSMClient, GetParameterCommand } = await import(SSM_PACKAGE));
  } catch (error) {
    throw missingDependency(
      SSM_PACKAGE,
      `cmd:aws ssm get-parameter --name ${name} --with-decryption ` +
        `--query Parameter.Value --output text`,
      error,
    );
  }

  const client = new SSMClient({});
  const response = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );

  const value: string | undefined = response.Parameter?.Value;
  if (!value) {
    throw new Error(`parameter "${name}" has no value`);
  }

  return value;
};

function splitFragment(reference: string): [string, string | undefined] {
  const trimmed = reference.trim();
  const hash = trimmed.indexOf('#');

  return hash === -1
    ? [trimmed, undefined]
    : [trimmed.slice(0, hash), trimmed.slice(hash + 1) || undefined];
}
