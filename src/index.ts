#!/usr/bin/env node

// Process command-line arguments before any other imports
import { processCommandLineArgs } from './help.js';
processCommandLineArgs();

// Only import other modules after processing command line flags
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initializePools, closePools } from "./db/pools.js";
import { debug, warn } from "./logging.js";
import { guardToolResponse } from "./security/guard.js";
import { runSubcommand } from "./cli.js";
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

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Load environment variables before any other imports
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

debug('startup', 'environment loaded', { projectRoot, envPath });


/**
 * MCP server providing MySQL database tools:
 *   1) Query - Execute read-only SQL queries
 *   2) Info - Get database information
 *   3) Environments - List available environments
 */

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
  debug('server', 'handling ListTools request');
  
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
  return toolsList;
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  debug('server', 'handling CallTool request', { name });

  try {
    switch (name) {
      case queryToolName: {
        const validated = QueryToolSchema.parse(args);
        return guardToolResponse(name, await runQueryTool(validated));
      }
      case infoToolName: {
        const validated = InfoToolSchema.parse(args);
        return guardToolResponse(name, await runInfoTool(validated));
      }
      case environmentsToolName: {
        const validated = EnvironmentsToolSchema.parse(args);
        return guardToolResponse(name, await runEnvironmentsTool(validated));
      }
      default: {
        throw new Error(`Unknown tool: ${name}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    debug('server', 'tool execution failed', { name, message });
    throw error;
  }
});

// Handle process termination
async function cleanup() {
  await closePools();
  debug('server', 'cleanup completed');
}

// Clean server startup function matching the PostgreSQL example
async function runServer() {
  // Subcommands run instead of the server. They write to stdout, which is only
  // safe because no MCP transport is attached yet.
  if (await runSubcommand(process.argv.slice(2))) {
    return;
  }

  // Credential sources may shell out to a keychain or call AWS, so pool setup is
  // asynchronous and must finish before the transport starts accepting requests.
  await initializePools();

  const transport = new StdioServerTransport();

  await server.connect(transport);
  debug('server', 'connected and running on stdio');

  process.stderr.write('[MCP-MYSQL-SERVER] Ready to handle requests\n');
}

// Simple error handler for main function
runServer().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  warn('server', 'failed to start MCP server', { message });
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

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  debug('server', 'uncaught exception', { message: error.message });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  debug('server', 'unhandled rejection', { message });
});
