import { createPool, Pool } from "mysql2/promise";
import { Environment } from "../types/index.js";
import { buildPoolOptions } from "./options.js";
import { resolvePassword } from "../credentials/index.js";
import { debug, warn } from "../logging.js";

export const pools = new Map<Environment, Pool>();

/**
 * How each environment's password was obtained, whether or not it worked. Read
 * by the environments tool to report capability, so the values here are scheme
 * names only and never contain a credential.
 */
export const credentialSources = new Map<Environment, string>();

/**
 * Why an environment is unavailable, when a configured credential source failed.
 * Kept out of tool responses and surfaced through logs and `doctor`, because a
 * resolver's error text can quote whatever the underlying tool printed.
 */
export const credentialErrors = new Map<Environment, string>();

let poolsInitialized = false;

// Map of environment to env var prefix
const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

export function envPrefixFor(environment: Environment): string {
  return ENV_PREFIX_MAP[environment];
}

/**
 * Resolves credentials and creates a pool per configured environment.
 *
 * Asynchronous because a credential source may shell out to a keychain or call
 * AWS. Every environment is resolved independently, so one broken source
 * disables only its own environment.
 */
export async function initializePools(): Promise<void> {
  if (poolsInitialized) {
    debug('pools', 'pools already initialized');
    return;
  }

  for (const environment of Object.values(Environment.enum)) {
    const envPrefix = ENV_PREFIX_MAP[environment];
    const credential = await resolvePassword({ environment, envPrefix });

    credentialSources.set(environment, credential.source);
    if (credential.error) {
      credentialErrors.set(environment, credential.error);
    }

    const config = buildPoolOptions(envPrefix, credential.password);

    // Only presence is logged, never the values. stderr is captured by the MCP
    // client and written to its log files.
    debug('pools', `initializing ${environment}`, {
      hasHost: !!config.host,
      hasUser: !!config.user,
      hasPassword: !!config.password,
      hasDatabase: !!config.database,
      port: config.port ?? 3306,
      ssl: !!config.ssl,
      credentialSource: credential.source,
    });

    if (credential.error) {
      warn(
        'credentials',
        `${environment} is unavailable: could not resolve the password from ` +
          `${credential.source}`,
        { reason: credential.error },
      );
      continue;
    }

    if (config.host && config.user && config.password && config.database) {
      try {
        pools.set(environment, createPool(config));
        debug('pools', `pool created for ${environment}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        warn('pools', `could not create pool for ${environment}`, { message });
      }
    } else {
      debug('pools', `skipping ${environment}: incomplete configuration`);
    }
  }

  poolsInitialized = true;
  debug('pools', 'initialization complete', { configured: Array.from(pools.keys()) });
}

export async function closePools() {
  for (const [env, pool] of pools.entries()) {
    try {
      await pool.end();
      debug('pools', `closed pool for ${env}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('pools', `error closing pool for ${env}`, { message });
    }
  }
}

/** Test seam so suites can re-run initialization with different configuration. */
export function resetPoolsForTesting(): void {
  pools.clear();
  credentialSources.clear();
  credentialErrors.clear();
  poolsInitialized = false;
}
