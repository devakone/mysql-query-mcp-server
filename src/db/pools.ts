import { createPool, Pool } from "mysql2/promise";
import { Environment } from "../types/index.js";
import { buildPoolOptions } from "./options.js";
import { debug, warn } from "../logging.js";

export const pools = new Map<Environment, Pool>();
let poolsInitialized = false;

// Map of environment to env var prefix
const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

export function initializePools() {
  if (poolsInitialized) {
    debug('pools', 'pools already initialized');
    return;
  }

  Object.values(Environment.enum).forEach((env) => {
    const envPrefix = ENV_PREFIX_MAP[env];
    const config = buildPoolOptions(envPrefix);

    // Only presence is logged, never the values. stderr is captured by the MCP
    // client and written to its log files.
    debug('pools', `initializing ${env}`, {
      hasHost: !!config.host,
      hasUser: !!config.user,
      hasPassword: !!config.password,
      hasDatabase: !!config.database,
      port: config.port ?? 3306,
      ssl: !!config.ssl,
    });

    if (config.host && config.user && config.password && config.database) {
      try {
        pools.set(env, createPool(config));
        debug('pools', `pool created for ${env}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        warn('pools', `could not create pool for ${env}`, { message });
      }
    } else {
      debug('pools', `skipping ${env}: incomplete configuration`);
    }
  });

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
