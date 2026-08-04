import { z } from "zod";
import { QueryParams, QueryResult, Environment } from "../types/index.js";
import { pools } from "../db/pools.js";
import { debug } from "../logging.js";

export const queryToolName = "query";
export const queryToolDescription = "Execute read-only SQL queries against MySQL databases";
export const QueryToolSchema = QueryParams;

// Validate query is read-only
export function isReadOnlyQuery(sql: string): boolean {
  const upperSql = sql.trim().toUpperCase();
  return upperSql.startsWith("SELECT") || upperSql.startsWith("SHOW") ||
         upperSql.startsWith("DESCRIBE") || upperSql.startsWith("DESC");
}

export async function runQueryTool(params: z.infer<typeof QueryToolSchema>): Promise<{ content: { type: string; text: string }[] }> {
  const { sql, environment: rawEnvironment, timeout = 30000 } = params;

  debug('query', 'starting query execution', { environment: rawEnvironment, timeout });

  // Validate query
  if (!isReadOnlyQuery(sql)) {
    debug('query', 'rejected: not a read-only query');
    throw new Error("Only SELECT, SHOW, DESCRIBE, and DESC queries are allowed");
  }

  // Validate environment
  const environment = Environment.parse(rawEnvironment);

  // Get connection pool
  const pool = pools.get(environment);
  if (!pool) {
    debug('query', 'no pool for environment', {
      environment,
      configured: Array.from(pools.keys()),
    });
    throw new Error(`No connection pool available for environment: ${environment}`);
  }

  try {
    // Execute query with timeout
    const startTime = Date.now();
    const connection = await pool.getConnection();

    try {
      const result = await Promise.race([
        connection.query(sql),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
        ),
      ]) as [any[], any[]];

      const [rows, fields] = result;
      const executionTime = Date.now() - startTime;
      debug('query', 'query executed', {
        environment,
        rowCount: rows.length,
        executionTime,
        fieldCount: fields.length,
      });

      const queryResult: QueryResult = {
        rows: rows as unknown[],
        fields: fields.map(f => ({
          name: f.name,
          type: f.type,
          length: f.length,
        })),
        executionTime,
        rowCount: rows.length,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(queryResult, null, 2),
        }],
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    debug('query', 'query failed', { environment, message });
    throw new Error(`Query execution failed: ${message}`);
  }
}
