import type { PoolOptions } from "mysql2/promise";

export const DEFAULT_MYSQL_TIMEZONE = "Z";

export function getMysqlTimezone(): string {
  return process.env.MYSQL_TIMEZONE || DEFAULT_MYSQL_TIMEZONE;
}

export function buildPoolOptions(envPrefix: string): PoolOptions {
  return {
    host: process.env[`${envPrefix}_DB_HOST`],
    user: process.env[`${envPrefix}_DB_USER`],
    password: process.env[`${envPrefix}_DB_PASS`],
    database: process.env[`${envPrefix}_DB_NAME`],
    port: process.env[`${envPrefix}_DB_PORT`] ? Number(process.env[`${envPrefix}_DB_PORT`]) : undefined,
    ssl: process.env.MCP_MYSQL_SSL === "true" ? {} : undefined,
    connectionLimit: 5,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    dateStrings: true,
    timezone: getMysqlTimezone(),
  };
}
