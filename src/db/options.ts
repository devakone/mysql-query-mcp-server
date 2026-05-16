import type { PoolOptions } from "mysql2/promise";

export const DEFAULT_MYSQL_TIMEZONE = "Z";

export function getMysqlTimezone(): string {
  return process.env.MYSQL_TIMEZONE || DEFAULT_MYSQL_TIMEZONE;
}

function getDatabasePort(envPrefix: string): number | undefined {
  const port = process.env[`${envPrefix}_DB_PORT`];
  return port ? Number.parseInt(port, 10) : undefined;
}

export function buildPoolOptions(envPrefix: string): PoolOptions {
  const sslEnv = process.env[`${envPrefix}_DB_SSL`] ?? process.env.MCP_MYSQL_SSL;

  return {
    host: process.env[`${envPrefix}_DB_HOST`],
    user: process.env[`${envPrefix}_DB_USER`],
    password: process.env[`${envPrefix}_DB_PASS`],
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
