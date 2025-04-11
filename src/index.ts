#!/usr/bin/env node

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pools } from "./db/pools.js";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Global server reference for logging
let globalServer: Server | null = null;
let isConnected = false;
type LogLevel = "debug" | "error" | "info" | "notice" | "warning" | "critical" | "alert" | "emergency";

function debug(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] DEBUG: ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}\n`;
  process.stderr.write(logMessage);
}

// Load environment variables before any other imports
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

// Debug environment variables
debug('Environment variables loaded:', {
  __dirname,
  projectRoot,
  envPath,
  PRODUCTION_DB_HOST: process.env.PRODUCTION_DB_HOST,
  PRODUCTION_DB_USER: process.env.PRODUCTION_DB_USER,
  PRODUCTION_DB_NAME: process.env.PRODUCTION_DB_NAME,
  DEVELOPMENT_DB_HOST: process.env.DEVELOPMENT_DB_HOST,
  LOCAL_DB_HOST: process.env.LOCAL_DB_HOST,
});

// Initialize database pools first
import "./db/pools.js";

// Then import MCP server and tools
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

debug('Importing tools...');

import {
  queryToolName,
  queryToolDescription,
  QueryToolSchema,
  runQueryTool,
} from "./tools/query.js";
debug('Query tool imported:', { queryToolName });

import {
  infoToolName,
  infoToolDescription,
  InfoToolSchema,
  runInfoTool,
} from "./tools/info.js";
debug('Info tool imported:', { infoToolName });

import {
  environmentsToolName,
  environmentsToolDescription,
  EnvironmentsToolSchema,
  runEnvironmentsTool,
} from "./tools/environments.js";
debug('Environments tool imported:', { environmentsToolName });

debug('All tools imported successfully');

/**
 * MCP server providing MySQL database tools:
 *   1) Query - Execute read-only SQL queries
 *   2) Info - Get database information
 *   3) Environments - List available environments
 */

// Create an MCP server instance
debug('Creating MCP server instance...');
const server = new Server(
  {
    name: "mysql-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        [queryToolName]: {
          description: queryToolDescription,
          inputSchema: {
            type: "object",
            properties: {
              sql: {
                type: "string",
                description: "SQL query to execute (SELECT and SHOW only)",
              },
              environment: {
                type: "string",
                enum: ["local", "development", "staging", "production"],
                description: "Target environment to run the query against",
              },
              timeout: {
                type: "number",
                description: "Query timeout in milliseconds (default: 30000)",
              },
            },
            required: ["sql", "environment"],
          },
        },
        [infoToolName]: {
          description: infoToolDescription,
          inputSchema: {
            type: "object",
            properties: {
              environment: {
                type: "string",
                enum: ["local", "development", "staging", "production"],
                description: "Target environment to get information from",
              },
            },
            required: ["environment"],
          },
        },
        [environmentsToolName]: {
          description: environmentsToolDescription,
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      }
    },
  },
);
debug('Server instance created');

// Store server reference globally for logging
globalServer = server;
debug('Global server reference set');

// Register tools before starting server
debug('Registering tools...');

// Register ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debug('Handling ListTools request');
  debug('Tool names available:', { queryToolName, infoToolName, environmentsToolName });
  
  const toolsList = {
    tools: [
      {
        name: queryToolName,
        description: queryToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "SQL query to execute (SELECT and SHOW only)",
            },
            environment: {
              type: "string",
              enum: ["local", "development", "staging", "production"],
              description: "Target environment to run the query against",
            },
            timeout: {
              type: "number",
              description: "Query timeout in milliseconds (default: 30000)",
            },
          },
          required: ["sql", "environment"],
        },
      },
      {
        name: infoToolName,
        description: infoToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ["local", "development", "staging", "production"],
              description: "Target environment to get information from",
            },
          },
          required: ["environment"],
        },
      },
      {
        name: environmentsToolName,
        description: environmentsToolDescription,
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
  debug('Returning tools list:', toolsList);
  return toolsList;
});
debug('ListTools handler registered');

// Register call tool handler
debug('Setting up CallTool handler...');
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  debug('Handling CallTool request:', { name, args });

  try {
    switch (name) {
      case queryToolName: {
        const validated = QueryToolSchema.parse(args);
        debug('Validated query tool args:', validated);
        return await runQueryTool(validated);
      }
      case infoToolName: {
        const validated = InfoToolSchema.parse(args);
        debug('Validated info tool args:', validated);
        return await runInfoTool(validated);
      }
      case environmentsToolName: {
        const validated = EnvironmentsToolSchema.parse(args);
        debug('Validated environments tool args:', validated);
        return await runEnvironmentsTool(validated);
      }
      default: {
        const error = `Unknown tool: ${name}`;
        debug('Error:', error);
        throw new Error(error);
      }
    }
  } catch (error) {
    debug('Error executing tool:', error);
    throw error;
  }
});
debug('CallTool handler registered');

// Start server
debug('Starting server...');
const transport = new StdioServerTransport();

// Keep process alive and handle stdio
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Connect server and handle connection state
async function startServer() {
  try {
    debug('Connecting server...');
    await server.connect(transport);
    isConnected = true;
    debug('Server connected successfully');
    debug('Server initialization complete');
  } catch (error) {
    debug('Error connecting server:', error);
    process.exit(1);
  }
}

// Handle process termination
async function cleanup() {
  debug('Starting cleanup...');
  
  for (const [env, pool] of pools.entries()) {
    try {
      debug(`Closing pool for ${env}...`);
      await pool.end();
      debug(`Pool for ${env} closed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      debug(`Error closing pool for ${env}:`, error);
    }
  }
  
  debug('Server cleanup completed');
}

// Start the server
startServer().catch(error => {
  debug('Error starting server:', error);
  process.exit(1);
});

// Handle process signals
process.on('SIGINT', async () => {
  debug('Received SIGINT');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  debug('Received SIGTERM');
  await cleanup();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  debug('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  debug('Unhandled rejection:', message);
});

debug('MySQL MCP Server running on stdio');
