import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Environment types
export const Environment = z.enum(['local', 'development', 'staging', 'production']);
export type Environment = z.infer<typeof Environment>;

// Database configuration
export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  port?: number;
  connectionLimit?: number;
}

// Query parameters schema
export const QueryParams = z.object({
  sql: z.string().min(1),
  environment: Environment,
  timeout: z.number().optional().default(30000),
});
export type QueryParameters = z.infer<typeof QueryParams>;

// Info parameters schema
export const InfoParams = z.object({
  environment: Environment,
});
export type InfoParameters = z.infer<typeof InfoParams>;

// Query result type
export interface QueryResult {
  rows: unknown[];
  fields: {
    name: string;
    type: string;
    length: number;
  }[];
  executionTime: number;
  rowCount: number;
}

// Database info result type
export interface DatabaseInfo {
  version: string;
  status: string;
  variables: Record<string, string>;
  processlist: unknown[];
  databases: string[];
}

// Error types
export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

// Tool definitions
export interface MySQLTools {
  query: Tool;
  info: Tool;
  environments: Tool;
} 