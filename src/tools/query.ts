import { z } from "zod";
import { QueryParams, QueryResult, Environment } from "../types/index.js";
import { pools } from "../db/pools.js";

function debug(message: string, ...args: any[]) {
  process.stderr.write(`DEBUG [Query]: ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}\n`);
}

export const queryToolName = "query";
export const queryToolDescription = "Execute read-only SQL queries against MySQL databases";
export const QueryToolSchema = QueryParams;

// Validate query is read-only
function isReadOnlyQuery(sql: string): boolean {
  const upperSql = sql.trim().toUpperCase();
  return upperSql.startsWith("SELECT") || upperSql.startsWith("SHOW") || 
         upperSql.startsWith("DESCRIBE") || upperSql.startsWith("DESC");
}

export async function runQueryTool(params: z.infer<typeof QueryToolSchema>): Promise<{ content: { type: string; text: string }[] }> {
  const { sql, environment: rawEnvironment, timeout = 30000 } = params;
  
  debug('Starting query execution with params:', { sql, environment: rawEnvironment, timeout });
  debug('Raw environment type:', typeof rawEnvironment);
  debug('Raw environment value:', rawEnvironment);

  // Validate query
  if (!isReadOnlyQuery(sql)) {
    debug('Query validation failed: not a read-only query');
    throw new Error("Only SELECT, SHOW, DESCRIBE, and DESC queries are allowed");
  }
  debug('Query validation passed: is read-only');

  // Validate environment
  debug('Validating environment:', rawEnvironment);
  debug('Environment enum:', Environment);
  debug('Environment enum values:', Object.values(Environment.enum));
  const environment = Environment.parse(rawEnvironment);
  debug('Environment validated successfully:', environment);
  debug('Validated environment type:', typeof environment);
  debug('Validated environment value:', environment);

  // Get connection pool
  debug('Getting connection pool for environment:', environment);
  debug('Available pools:', Array.from(pools.keys()));
  debug('Pool map type:', typeof pools);
  debug('Pool keys type:', Array.from(pools.keys()).map(k => typeof k));
  debug('Pool keys:', Array.from(pools.keys()));
  debug('Environment type:', typeof environment);
  debug('Environment value:', environment);
  debug('Pool has environment?', pools.has(environment));
  
  const pool = pools.get(environment);
  if (!pool) {
    debug('No pool found for environment:', environment);
    debug('Current pools state:', {
      size: pools.size,
      keys: Array.from(pools.keys()),
      envType: typeof environment,
      envValue: environment,
      poolsType: typeof pools,
      poolsEntries: Array.from(pools.entries()).map(([k]) => ({ key: k, type: typeof k }))
    });
    throw new Error(`No connection pool available for environment: ${environment}`);
  }
  debug('Found pool for environment:', environment);

  try {
    // Execute query with timeout
    const startTime = Date.now();
    debug('Getting connection from pool');
    const connection = await pool.getConnection();
    debug('Connection acquired successfully');
    
    try {
      debug('Executing query with timeout:', timeout);
      const result = await Promise.race([
        connection.query(sql),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
        ),
      ]) as [any[], any[]];

      const [rows, fields] = result;
      const executionTime = Date.now() - startTime;
      debug('Query executed successfully:', { 
        rowCount: rows.length, 
        executionTime,
        fieldCount: fields.length 
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
      debug('Releasing connection back to pool');
      connection.release();
      debug('Connection released');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    debug('Error executing query:', message);
    throw new Error(`Query execution failed: ${message}`);
  }
} 