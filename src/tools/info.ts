import { z } from "zod";
import { InfoParams, DatabaseInfo } from "../types/index.js";
import { pools } from "../db/pools.js";

export const infoToolName = "info";
export const infoToolDescription = "Get information about MySQL databases";
export const InfoToolSchema = InfoParams;

/**
 * Server variables reported by this tool.
 *
 * This is an allowlist rather than the full `SHOW VARIABLES` output. The full
 * output runs to several hundred entries and includes replication settings and
 * filesystem paths, none of which this tool exists to surface. Add entries here
 * when there is a reason to.
 */
const REPORTED_VARIABLES = [
  'version',
  'version_comment',
  'default_storage_engine',
  'character_set_server',
  'collation_server',
  'time_zone',
  'system_time_zone',
  'sql_mode',
  'transaction_isolation',
  'autocommit',
  'read_only',
  'super_read_only',
  'max_connections',
  'max_allowed_packet',
  'wait_timeout',
  'interactive_timeout',
  'net_read_timeout',
  'net_write_timeout',
  'group_concat_max_len',
  'lower_case_table_names',
  'require_secure_transport',
] as const;

/** Status counters reported by this tool. Same reasoning as above. */
const REPORTED_STATUS = [
  'Uptime',
  'Threads_connected',
  'Threads_running',
  'Queries',
  'Slow_queries',
] as const;

function pick(source: Record<string, string>, keys: readonly string[]): Record<string, string> {
  const picked: Record<string, string> = {};

  for (const key of keys) {
    if (source[key] !== undefined) {
      picked[key] = source[key];
    }
  }

  return picked;
}

function toVariableMap(rows: any[]): Record<string, string> {
  return rows.reduce((acc: Record<string, string>, row: any) => {
    acc[row.Variable_name] = row.Value;
    return acc;
  }, {});
}

export async function runInfoTool(params: z.infer<typeof InfoToolSchema>): Promise<{ content: { type: string; text: string }[] }> {
  const { environment } = params;

  // Get connection pool
  const pool = pools.get(environment);
  if (!pool) {
    throw new Error(`No connection pool available for environment: ${environment}`);
  }

  try {
    const connection = await pool.getConnection();

    try {
      // Get server version
      const [versionRows] = await connection.query("SELECT VERSION() as version") as [any[], any[]];
      const version = versionRows[0].version;

      // Get server status
      const [statusRows] = await connection.query("SHOW STATUS") as [any[], any[]];
      const status = toVariableMap(statusRows);

      // Get server variables
      const [variableRows] = await connection.query("SHOW VARIABLES") as [any[], any[]];
      const variables = toVariableMap(variableRows);

      // Get databases
      const [databaseRows] = await connection.query("SHOW DATABASES") as [any[], any[]];
      const databases = databaseRows.map((row: any) => row.Database);

      // SHOW PROCESSLIST is deliberately not reported. It exposes the in-flight
      // query text of every other session on the server, which belongs to other
      // applications and other people. Connection counts give the same
      // operational signal without that.
      const info: DatabaseInfo = {
        version,
        status: status.Uptime ? `Up ${status.Uptime} seconds` : "Unknown",
        variables: pick(variables, REPORTED_VARIABLES),
        counters: pick(status, REPORTED_STATUS),
        databases,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(info, null, 2),
        }],
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to get database info: ${message}`);
  }
}
