# Troubleshooting Guide

This guide helps you resolve common issues with the MySQL Query MCP Server.

## MCP Protocol Method Names

**Important:** The MCP protocol uses specific JSON-RPC method names:
- `tools/list` - Used by clients to request a list of available tools
- `tools/call` - Used by clients to call a specific tool

The SDK maps these to:
- `ListToolsRequestSchema` - For handling tools/list requests
- `CallToolRequestSchema` - For handling tools/call requests

If you're building a client that communicates with this server directly, make sure to use the correct method names in your JSON-RPC requests:

```json
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
    "name": "query",
    "arguments": {
      "sql": "SELECT 1",
      "environment": "development"
    }
  }
}
```

## Environment Limitations

**Important:** This tool is designed to work with four specific predefined environments:
- local
- development
- staging
- production

You cannot use custom environment names like "dev" or "prod". If you need to connect to a database outside of these environments, you must map it to one of these four names.

**Example of incorrect naming:**
```
DEV_DB_HOST=dev.example.com  # Wrong: "DEV" is not recognized
PROD_DB_HOST=prod.example.com  # Wrong: "PROD" is not recognized
```

**Example of correct naming:**
```
DEVELOPMENT_DB_HOST=dev.example.com  # Correct: "DEVELOPMENT" is recognized
PRODUCTION_DB_HOST=prod.example.com  # Correct: "PRODUCTION" is recognized
```

## Connection Issues

> Before working through this section, run `mysql-query-mcp doctor`. It reports
> every environment, whether its configuration is complete, where its password
> comes from, and whether that password resolves, without starting the server or
> connecting to a database. It never prints a credential.

### Problem: Cannot connect to database

**Symptoms:**
- "No connection pool available for environment" error
- "Connection refused" errors

**Possible causes and solutions:**

1. **Database credentials are incorrect**
   - Double-check your credentials in `.env` or your MCP configuration
   - Verify you can connect to the database using another client like MySQL Workbench

2. **A credential source failed to resolve**
   - `mysql-query-mcp doctor` shows `FAILED` in the PASSWORD column and the reason in DETAIL
   - The `environments` tool reports `"status": "credential-error"` for that environment. The reason is not in the tool response on purpose, since it can quote output from your secret manager. Use `doctor` or the server log
   - An environment whose source fails is disabled on its own. The others keep working
   - Common causes: not signed in to your secret manager (`op signin`, `vault login`, `aws sso login`), a keychain item that does not exist, or a typo in the reference

3. **Database server is not running**
   - Check if your MySQL server is running
   - For local databases: `sudo service mysql status` (Linux) or check Activity Monitor (Mac)

4. **Network/firewall restrictions**
   - Check if your database allows remote connections
   - Verify firewall settings allow connections on the configured MySQL port (`[ENV]_DB_PORT`, default `3306`)

5. **Missing environment variables**
   - Ensure all required variables for your environment are set
   - Run with `DEBUG=true` to see loaded configuration

6. **Incorrect custom port**
   - If your MySQL server is not on `3306`, set `[ENV]_DB_PORT` explicitly
   - Ensure the value is a valid integer such as `3307`
   
7. **Incorrect environment name**
   - Verify you're using one of the supported environment names: local, development, staging, production
   - Environment variables must be prefixed with LOCAL_, DEVELOPMENT_, STAGING_, or PRODUCTION_
   - You cannot use custom environment names with this tool (such as DEV_ or PROD_)

### Problem: A credential source is not resolving

**Symptoms:**
- `doctor` reports `FAILED` for one environment
- Server log shows `WARN [credentials] <env> is unavailable`

**Possible causes and solutions:**

1. **The keychain item does not exist**
   - Create it: `mysql-query-mcp credentials set production`
   - macOS: confirm with `security find-generic-password -s mysql-query-mcp -a production`
   - Linux: `secret-tool` must be installed (`libsecret-tools` on Debian and Ubuntu)

2. **`keychain:` on Windows**
   - Not supported, because reading Windows Credential Manager requires a native module
   - Use `cmd:` instead, for example `cmd:powershell -Command "Get-Secret -Name prod-mysql -AsPlainText"`

3. **The command works in your shell but not here**
   - The command runs through `/bin/sh -c` with the environment your MCP client gave the server, which is usually not your interactive shell environment. `PATH` in particular may differ
   - Use an absolute path, for example `cmd:/opt/homebrew/bin/op read op://Infra/db/password`

4. **An AWS source reports a missing package**
   - `aws-secrets:` and `aws-ssm:` need an SDK that is not bundled
   - Either install it alongside the server, or use the AWS CLI through `cmd:`, which the error message spells out for you

5. **The source resolved to an empty value**
   - Treated as a failure on purpose, since an empty password would fail at connection time with a much less obvious error
   - Check the reference points at the right field, for example `#password` on a JSON secret

For step-by-step setup of each source, see the [Migration Guide](MIGRATION.md).

### Problem: SSL connection errors

**Symptoms:**
- "SSL connection error" messages
- "Cannot establish secure connection" errors

**Solutions:**
- If your database doesn't support SSL, set `MCP_MYSQL_SSL=false`
- For databases that require SSL but have self-signed certificates, you may need to set `MCP_MYSQL_REJECT_UNAUTHORIZED=false`
- For production databases that require SSL, ensure your MySQL client supports it

## Query Issues

### Problem: Query execution fails

**Symptoms:**
- "Query execution failed" errors
- No results returned

**Possible causes and solutions:**

1. **Invalid SQL syntax**
   - Check your SQL syntax carefully
   - Test the query directly in MySQL client

2. **Unsupported query type**
   - Only SELECT, SHOW, and DESCRIBE queries are supported
   - This tool strictly enforces read-only operations
   - You cannot use INSERT, UPDATE, DELETE, CREATE, DROP, or any other data/schema modification queries

3. **Query timeout**
   - Your query may be taking too long to execute
   - Optimize your query or increase the timeout parameter

## MCP Server Issues

### Problem: Server won't start

**Symptoms:**
- Process exits immediately after starting
- Port binding errors

**Possible causes and solutions:**

1. **Node.js version incompatibility**
   - Ensure you're using Node.js 14 or higher
   - Update Node.js if necessary

2. **Permission issues**
   - Ensure you have the necessary permissions to run the server
   - Try running with elevated permissions if needed

3. **Binary not found**
   - Verify the installation path: `which mysql-query-mcp`
   - Reinstall the package if necessary

### Problem: "Method not found" errors

**Symptoms:**
- Client receives "Method not found" error responses
- No data is returned from the server

**Possible causes and solutions:**

1. **Incorrect method name format**
   - Ensure client is using `tools/list` and `tools/call` method names
   - Do NOT use `listTools`, `callTool`, or other variations

2. **SDK version mismatch**
   - Ensure you're using a compatible version of the MCP SDK

## Integration Issues

### Problem: AI assistant doesn't recognize the MySQL tools

**Symptoms:**
- AI assistant mentions it can't access database functionality
- AI assistant doesn't list MySQL tools when asked

**Possible causes and solutions:**

1. **MCP Server not correctly configured**
   - Verify your MCP configuration file has the correct setup
   - Make sure to use the full environment names (DEVELOPMENT, not DEV)

2. **Extension not properly configured**
   - Ensure your AI tool has the extension properly configured
   - Restart the AI tool after configuration changes

## Debugging Tools

### Enable Debug Mode

Run the server with debug logging enabled by setting in your configuration:

```json
"env": {
  "DEBUG": "true"
}
```

Or when running directly:

```bash
DEBUG=true mysql-query-mcp
```

This will output detailed logs to help diagnose issues.

### Check Connectivity

Test database connectivity directly:

```bash
mysql -h YOUR_HOST -u YOUR_USER -p
```

### Check MySQL Query Tool Status

Verify the server is functioning correctly:

```bash
mysql-query-mcp --version
```

## Getting Help

If you can't resolve your issue with this guide:

1. [Open an issue](https://github.com/devakone/mysql-query-mcp-server/issues) on GitHub
2. Include:
   - Error messages
   - Steps to reproduce the issue
   - Your environment details (OS, Node.js version)
   - Debug logs (with sensitive information removed) 
