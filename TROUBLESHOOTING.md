# Troubleshooting Guide

This guide helps you resolve common issues with the MySQL Query MCP Server.

## Environment Limitations

**Important:** This tool is designed to work with four specific predefined environments:
- local
- development
- staging
- production

You cannot use custom environment names. If you need to connect to a database outside of these environments, you must map it to one of these four names.

## Connection Issues

### Problem: Cannot connect to database

**Symptoms:**
- "No connection pool available for environment" error
- "Connection refused" errors

**Possible causes and solutions:**

1. **Database credentials are incorrect**
   - Double-check your credentials in `.env`
   - Verify you can connect to the database using another client like MySQL Workbench

2. **Database server is not running**
   - Check if your MySQL server is running
   - For local databases: `sudo service mysql status` (Linux) or check Activity Monitor (Mac)

3. **Network/firewall restrictions**
   - Check if your database allows remote connections
   - Verify firewall settings allow connections on the MySQL port (usually 3306)

4. **Missing environment variables**
   - Ensure all required variables for your environment are set in `.env`
   - Run with `DEBUG=true` to see loaded configuration
   
5. **Incorrect environment name**
   - Verify you're using one of the supported environment names: local, development, staging, production
   - You cannot use custom environment names with this tool

### Problem: SSL connection errors

**Symptoms:**
- "SSL connection error" messages
- "Cannot establish secure connection" errors

**Solutions:**
- Set `[ENV]_DB_SSL=false` if your database doesn't support SSL
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

### Problem: Claude doesn't recognize the MySQL tools

**Symptoms:**
- Claude mentions it can't access database functionality
- Claude doesn't list MySQL tools when asked

**Possible causes and solutions:**

1. **MCP Server not correctly configured**
   - Verify your `.cursor/mcp.json` file has the correct configuration
   - Make sure the binary name is `mysql-query-mcp`

2. **Extension not properly configured**
   - Ensure Cursor IDE has the extension properly configured
   - Restart Cursor IDE, Windsurf, or Claude Desktop after configuration

## Debugging Tools

### Enable Debug Mode

Run the server with debug logging enabled:

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