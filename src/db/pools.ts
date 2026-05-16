import { createPool, Pool } from "mysql2/promise";
import { Environment } from "../types/index.js";
import { buildPoolOptions } from "./options.js";

function debug(message: string, ...args: any[]) {
  process.stderr.write(`DEBUG [Pools]: ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}\n`);
}

export const pools = new Map<Environment, Pool>();
let poolsInitialized = false;

const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

export function initializePools() {
  if (poolsInitialized) {
    debug("Pools already initialized");
    return;
  }

  debug("Initializing database pools...");
  debug("Environment enum options:", Object.values(Environment.enum));

  Object.values(Environment.enum).forEach((env) => {
    const envPrefix = ENV_PREFIX_MAP[env];
    const config = buildPoolOptions(envPrefix);

    debug(`=== Initializing pool for ${env} environment ===`);
    debug(`Using prefix: ${envPrefix}`);
    debug(`HOST: ${process.env[`${envPrefix}_DB_HOST`]}`);
    debug(`USER: ${process.env[`${envPrefix}_DB_USER`]}`);
    debug(`DB: ${process.env[`${envPrefix}_DB_NAME`]}`);
    debug(`PASS: ${process.env[`${envPrefix}_DB_PASS`] ? "set" : "not set"}`);
    debug(`PORT: ${config.port ?? "default"}`);
    debug(`SSL: ${process.env[`${envPrefix}_DB_SSL`] ?? process.env.MCP_MYSQL_SSL}`);

    if (config.host && config.user && config.password && config.database) {
      debug(`Creating pool for ${env} with config:`, {
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port ?? 3306,
        ssl: config.ssl,
        dateStrings: config.dateStrings,
        timezone: config.timezone,
        hasPassword: !!config.password,
      });

      try {
        pools.set(env, createPool(config));
        debug(`Pool created successfully for ${env}`);
      } catch (error) {
        debug(`Error creating pool for ${env}:`, error);
      }
    } else {
      debug(`Missing configuration for ${env}:`, {
        hasHost: !!config.host,
        hasUser: !!config.user,
        hasPass: !!config.password,
        hasDB: !!config.database,
      });
    }
  });

  poolsInitialized = true;
  debug("Pools map keys:", Array.from(pools.keys()));
}

export async function closePools() {
  for (const [env, pool] of pools.entries()) {
    try {
      debug(`Closing pool for ${env}...`);
      await pool.end();
      debug(`Pool for ${env} closed successfully`);
    } catch (error) {
      debug(`Error closing pool for ${env}:`, error);
    }
  }
}
