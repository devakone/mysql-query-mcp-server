import { z } from "zod";
import { Pool } from "mysql2/promise";
import { Environment, InfoParams, DatabaseInfo } from "../types/index.js";
import { config } from "dotenv";
import { pools } from "../db/pools.js";

config();

export const infoToolName = "info";
export const infoToolDescription = "Get information about MySQL databases";
export const InfoToolSchema = InfoParams;

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
      const status = statusRows.reduce((acc: Record<string, string>, row: any) => {
        acc[row.Variable_name] = row.Value;
        return acc;
      }, {});

      // Get server variables
      const [variableRows] = await connection.query("SHOW VARIABLES") as [any[], any[]];
      const variables = variableRows.reduce((acc: Record<string, string>, row: any) => {
        acc[row.Variable_name] = row.Value;
        return acc;
      }, {});

      // Get process list
      const [processRows] = await connection.query("SHOW PROCESSLIST") as [any[], any[]];
      const processlist = processRows;

      // Get databases
      const [databaseRows] = await connection.query("SHOW DATABASES") as [any[], any[]];
      const databases = databaseRows.map((row: any) => row.Database);

      const info: DatabaseInfo = {
        version,
        status: status.Uptime ? `Up ${status.Uptime} seconds` : "Unknown",
        variables,
        processlist,
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