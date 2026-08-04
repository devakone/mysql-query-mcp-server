import type { PoolOptions } from "mysql2/promise";

export const DEFAULT_MYSQL_TIMEZONE = "Z";

export function getMysqlTimezone(): string {
  return process.env.MYSQL_TIMEZONE || DEFAULT_MYSQL_TIMEZONE;
}

function getDatabasePort(envPrefix: string): number | undefined {
  const port = process.env[`${envPrefix}_DB_PORT`];
  return port ? Number.parseInt(port, 10) : undefined;
}

/**
 * Builds pool options for an environment.
 *
 * `password` is passed in rather than read from the environment, because it may
 * have come from a credential source (keychain, a helper command, AWS) instead
 * of `<ENV>_DB_PASS`. It falls back to the env var so that callers which do not
 * resolve credentials, such as the options tests, keep working.
 */
export function buildPoolOptions(envPrefix: string, password?: string): PoolOptions {
  const sslEnv = process.env[`${envPrefix}_DB_SSL`] ?? process.env.MCP_MYSQL_SSL;

  return {
    host: process.env[`${envPrefix}_DB_HOST`],
    user: process.env[`${envPrefix}_DB_USER`],
    password: password ?? process.env[`${envPrefix}_DB_PASS`],
    database: process.env[`${envPrefix}_DB_NAME`],
    port: getDatabasePort(envPrefix),
    ssl: sslEnv === "true" ? {} : undefined,
    connectionLimit: 5,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    dateStrings: true,
    timezone: getMysqlTimezone(),
  };
}
