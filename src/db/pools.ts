import { createPool, Pool, PoolOptions } from "mysql2/promise";
import { Environment } from "../types/index.js";

function debug(message: string, ...args: any[]) {
  process.stderr.write(`DEBUG [Pools]: ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}\n`);
}

// Connection pools for each environment
export const pools = new Map<string, Pool>();

debug('Initializing database pools...');
debug('Environment enum options:', Object.values(Environment.enum));
debug('Environment enum type:', typeof Environment);
debug('Environment enum:', Environment);

// Map of environment to env var prefix
const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

// Initialize pools
Object.values(Environment.enum).forEach((env) => {
  const envPrefix = ENV_PREFIX_MAP[env];
  
  debug(`=== Initializing pool for ${env} environment ===`);
  debug(`Using prefix: ${envPrefix}`);
  debug('Environment variables:');
  debug(`HOST: ${process.env[`${envPrefix}_DB_HOST`]}`);
  debug(`USER: ${process.env[`${envPrefix}_DB_USER`]}`);
  debug(`DB: ${process.env[`${envPrefix}_DB_NAME`]}`);
  debug(`PASS: ${process.env[`${envPrefix}_DB_PASS`] ? 'set' : 'not set'}`);
  debug(`SSL: ${process.env.MCP_MYSQL_SSL}`);
  
  const config: PoolOptions = {
    host: process.env[`${envPrefix}_DB_HOST`],
    user: process.env[`${envPrefix}_DB_USER`],
    password: process.env[`${envPrefix}_DB_PASS`],
    database: process.env[`${envPrefix}_DB_NAME`],
    ssl: process.env.MCP_MYSQL_SSL === "true" ? {} : undefined,
    connectionLimit: 5,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  if (config.host && config.user && config.password && config.database) {
    debug(`Creating pool for ${env} with config:`, {
      host: config.host,
      user: config.user,
      database: config.database,
      ssl: config.ssl,
      hasPassword: !!config.password
    });
    
    try {
      const pool = createPool(config);
      pools.set(env, pool);
      debug(`Pool created successfully for ${env}`);
      debug(`Pool type for ${env}:`, typeof pool);
      debug(`Pool methods for ${env}:`, Object.keys(pool));
    } catch (error) {
      debug(`Error creating pool for ${env}:`, error);
    }
  } else {
    debug(`Missing configuration for ${env}:`, {
      hasHost: !!config.host,
      hasUser: !!config.user,
      hasPass: !!config.password,
      hasDB: !!config.database
    });
  }
});

debug('Final pools state:');
debug('Pools map keys:', Array.from(pools.keys()));
debug('Pools map size:', pools.size);
debug('Pools map entries:', Array.from(pools.entries()).map(([env]) => env));
