# Troubleshooting Guide

This guide helps you resolve common issues with the MySQL Query MCP Server.

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

### Problem: Cannot connect to database

**Symptoms:**
- "No connection pool available for environment" error
- "Connection refused" errors

**Possible causes and solutions:**

1. **Database credentials are incorrect**
   - Double-check your credentials in `.env` or your MCP configuration
   - Verify you can connect to the database using another client like MySQL Workbench

2. **Database server is not running**
   - Check if your MySQL server is running
   - For local databases: `sudo service mysql status` (Linux) or check Activity Monitor (Mac)

3. **Network/firewall restrictions**
   - Check if your database allows remote connections
   - Verify firewall settings allow connections on the MySQL port (usually 3306)

4. **Missing environment variables**
   - Ensure all required variables for your environment are set
   - Run with `DEBUG=true` to see loaded configuration
   
5. **Incorrect environment name**
   - Verify you're using one of the supported environment names: local, development, staging, production
   - Environment variables must be prefixed with LOCAL_, DEVELOPMENT_, STAGING_, or PRODUCTION_
   - You cannot use custom environment names with this tool (such as DEV_ or PROD_)

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