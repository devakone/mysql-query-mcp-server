# Model Context Protocol (MCP) Server Implementation Guide

## Key Learnings

After studying the official PostgreSQL server example from the MCP repository and testing different configurations, here are the key findings:

### 1. Method Names

The MCP protocol uses specific JSON-RPC method names:
- `tools/list` - For listing available tools
- `tools/call` - For calling a specific tool

### 2. SDK Handler Registration

When using the MCP TypeScript SDK, you must register handlers using these schemas:
- `ListToolsRequestSchema` - For handling tools/list requests
- `CallToolRequestSchema` - For handling tools/call requests

The SDK handles translating between the external method names (`tools/list`, `tools/call`) and the internal handler methods.

### 3. Response Format

MCP servers must return properly formatted responses:
- For `tools/list`: A list of tools with name, description, and inputSchema
- For `tools/call`: Results with content array and isError flag

### 4. Transport Layer

The `StdioServerTransport` class handles communication over standard input/output.

## Minimal Implementation

Here's a minimal implementation that works correctly:

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Create server with basic configuration
const server = new Server(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Handle tools/list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "my-tool",
        description: "Tool description",
        inputSchema: {
          type: "object",
          properties: {
            param1: { type: "string" }
          },
          required: ["param1"]
        }
      }
    ]
  };
});

// Handle tools/call requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "my-tool") {
    return {
      content: [{ type: "text", text: "Result text" }],
      isError: false
    };
  }
  throw new Error("Unknown tool");
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);
```

## Testing Your MCP Server

You can test your MCP server by sending properly formatted JSON-RPC requests:

```javascript
// List tools
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/list",
  "params": {}
}

// Call a tool
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "tool-name",
    "arguments": {
      "param1": "value1"
    }
  }
}
```

## Common Issues

1. **Method Not Found Error**: Make sure you're using `tools/list` and `tools/call` as method names, not `listTools`, `callTool`, or any other variation.

2. **Invalid Response Format**: Ensure your response format matches what the MCP protocol expects.

3. **Transport Issues**: Use the provided `StdioServerTransport` class without modification for best compatibility.

For more detailed troubleshooting, see [Troubleshooting Guide](./TROUBLESHOOTING.md).

For integration examples, check the [Integration Examples](./INTEGRATION_EXAMPLE.md).

## Resources

- [MCP Server Examples](https://github.com/modelcontextprotocol/servers) - Official reference implementations
- [PostgreSQL MCP Server](https://github.com/modelcontextprotocol/servers/blob/main/src/postgres/index.ts) - Simple reference implementation 