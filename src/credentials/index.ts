import type { Environment } from "../types/index.js";
import { registerSecret } from "../security/secrets.js";
import { warn } from "../logging.js";
import { resolveFromCommand } from "./command.js";
import { resolveFromKeychain } from "./keychain.js";
import { resolveFromParameterStore, resolveFromSecretsManager } from "./aws.js";
import type { CredentialResolver, ResolveContext, ResolvedCredential } from "./types.js";

export type { ResolveContext, ResolvedCredential } from "./types.js";

/**
 * Password resolution for one environment.
 *
 * `<ENV>_DB_PASS_SOURCE` holds a reference to where the password lives rather
 * than the password itself, so the MCP client config file contains no secrets
 * and can be committed and shared. `<ENV>_DB_PASS` still works and is the
 * documented local and throwaway path.
 */

const RESOLVERS: Record<string, CredentialResolver> = {
  env: async (reference) => {
    const name = reference.trim();
    if (!name) throw new Error('no variable name given, expected env:VARIABLE_NAME');

    const value = process.env[name];
    if (!value) throw new Error(`environment variable ${name} is not set or is empty`);

    return value;
  },
  cmd: resolveFromCommand,
  keychain: resolveFromKeychain,
  'aws-secrets': resolveFromSecretsManager,
  'aws-ssm': resolveFromParameterStore,
};

export const CREDENTIAL_SCHEMES = Object.keys(RESOLVERS);

export interface ParsedReference {
  scheme: string;
  target: string;
}

/**
 * Splits `scheme:target` and strips a leading `//` from the target, so both
 * `keychain:production` and `keychain://mysql-query-mcp/production` work.
 * Returns null when there is no scheme at all.
 */
export function parseReference(reference: string): ParsedReference | null {
  const match = /^([a-z][a-z0-9+.-]*):(.*)$/is.exec(reference.trim());
  if (!match) return null;

  return {
    scheme: match[1].toLowerCase(),
    target: match[2].replace(/^\/\//, ''),
  };
}

/**
 * Resolves the password for one environment. Never throws: a failure is
 * reported in the returned object so that one broken source disables only its
 * own environment and the others keep working.
 */
export async function resolvePassword(context: ResolveContext): Promise<ResolvedCredential> {
  const { environment, envPrefix } = context;
  const reference = process.env[`${envPrefix}_DB_PASS_SOURCE`]?.trim();
  const inline = process.env[`${envPrefix}_DB_PASS`];

  if (reference) {
    if (inline) {
      warn(
        'credentials',
        `${environment}: both ${envPrefix}_DB_PASS and ${envPrefix}_DB_PASS_SOURCE are set. ` +
          `Using ${envPrefix}_DB_PASS_SOURCE. Remove ${envPrefix}_DB_PASS from your config`,
      );
    }

    const parsed = parseReference(reference);
    if (!parsed) {
      return {
        source: 'invalid',
        error:
          `${envPrefix}_DB_PASS_SOURCE has no scheme. Expected one of ` +
          `${CREDENTIAL_SCHEMES.map((scheme) => `${scheme}:`).join(' ')}`,
      };
    }

    const resolver = RESOLVERS[parsed.scheme];
    if (!resolver) {
      return {
        source: 'invalid',
        error:
          `unknown credential source "${parsed.scheme}:". Expected one of ` +
          `${CREDENTIAL_SCHEMES.map((scheme) => `${scheme}:`).join(' ')}`,
      };
    }

    try {
      const password = await resolver(parsed.target, context);

      if (!password) {
        return { source: parsed.scheme, error: 'the source resolved to an empty value' };
      }

      // Resolved secrets are not in process.env, so the response guard and the
      // logger cannot find them by scanning it. Register them explicitly.
      registerSecret(password);

      return { password, source: parsed.scheme };
    } catch (error) {
      return {
        source: parsed.scheme,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (inline) {
    if (isSensitiveEnvironment(environment)) {
      warn(
        'credentials',
        `${environment} is configured with a plaintext password in ${envPrefix}_DB_PASS. ` +
          `Consider ${envPrefix}_DB_PASS_SOURCE with keychain:, cmd:, aws-secrets:, or ` +
          `aws-ssm: so the password is not stored in your MCP client config file. ` +
          `See https://github.com/devakone/mysql-query-mcp-server#credential-sources`,
      );
    }

    return { password: inline, source: 'env' };
  }

  return { source: 'none' };
}

/**
 * Which environments get a nag for using a plaintext password. Only production,
 * so that local development stays quiet.
 */
function isSensitiveEnvironment(environment: Environment): boolean {
  return environment === 'production';
}
