#!/usr/bin/env node

// Process command-line arguments before any other imports
import { processCommandLineArgs } from './help.js';
processCommandLineArgs();

// Only import other modules after processing command line flags
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

function debug(message: string, ...args: any[]) {
  if (process.env.DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] DEBUG: ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}\n`;
    process.stderr.write(logMessage);
  }
}

// Load environment variables before any other imports
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

// Debug environment variables
debug('Environment variables loaded:', {
  __dirname,
  projectRoot,
  envPath,
});

// Then import pools and MCP server components
import { pools } from "./db/pools.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  queryToolName,
  queryToolDescription,
  QueryToolSchema,
  runQueryTool,
} from "./tools/query.js";

import {
  infoToolName,
  infoToolDescription,
  InfoToolSchema,
  runInfoTool,
} from "./tools/info.js";

import {
  environmentsToolName,
  environmentsToolDescription,
  EnvironmentsToolSchema,
  runEnvironmentsTool,
} from "./tools/environments.js";

// Create an MCP server instance
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

// Register ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debug('Handling ListTools request');
  
  return {
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
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  debug('Handling CallTool request:', { name, args });

  try {
    switch (name) {
      case queryToolName: {
        const validated = QueryToolSchema.parse(args);
        return await runQueryTool(validated);
      }
      case infoToolName: {
        const validated = InfoToolSchema.parse(args);
        return await runInfoTool(validated);
      }
      case environmentsToolName: {
        const validated = EnvironmentsToolSchema.parse(args);
        return await runEnvironmentsTool(validated);
      }
      default: {
        throw new Error(`Unknown tool: ${name}`);
      }
    }
  } catch (error) {
    debug('Error executing tool:', error);
    throw error;
  }
});

// Handle process termination
async function cleanup() {
  debug('Starting cleanup...');
  
  for (const [env, pool] of pools.entries()) {
    try {
      debug(`Closing pool for ${env}...`);
      await pool.end();
      debug(`Pool for ${env} closed successfully`);
    } catch (error) {
      debug(`Error closing pool for ${env}:`, error);
    }
  }
}

// Clean server startup function matching the PostgreSQL example
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  debug('Server connected and running on stdio');
}

// Simple error handler for main function
runServer().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

// Handle process signals for clean shutdown
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});
