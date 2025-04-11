# MySQL Query MCP Server

[![npm version](https://img.shields.io/npm/v/mysql-query-mcp-server.svg)](https://www.npmjs.com/package/mysql-query-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides **read-only** MySQL database queries for AI assistants. Execute queries, explore database structures, and investigate your data directly from your AI-powered tools.

## Supported AI Tools

This MCP server works with any tool that supports the Model Context Protocol, including:

- **Cursor IDE**: Set up in `.cursor/mcp.json`
- **Anthropic Claude**: Use with a compatible MCP client
- **Other MCP-compatible AI assistants**: Follow the tool's MCP configuration instructions

## Features & Limitations

### What It Does
- ✅ Execute **read-only** MySQL queries (SELECT, SHOW, DESCRIBE only)
- ✅ Work with predefined environments (local, development, staging, production)
- ✅ Provide database information and metadata
- ✅ List available database environments
- ✅ Support SSL connections for secure database access
- ✅ Implement query timeouts to prevent long-running operations

### What It Doesn't Do
- ❌ Execute write operations (INSERT, UPDATE, DELETE, CREATE, ALTER, etc.)
- ❌ Support custom environment names (limited to local, development, staging, production)
- ❌ Provide database design or schema generation capabilities
- ❌ Function as a full database management tool

This tool is designed specifically for **data investigation and exploration** through read-only queries. It is not intended for database administration, schema management, or data modification.

![MySQL Query MCP Demo](https://github.com/devakone/mysql-query-mcp-server/raw/main/docs/demo.gif)

## Quick Install

```bash
# Install globally with npm
npm install -g mysql-query-mcp-server

# Or run directly with npx
npx mysql-query-mcp-server
```

## Setup Instructions

### 1. Configure Your AI Tool to Use the MCP Server

1. Create or edit your MCP configuration file (e.g., `.cursor/mcp.json` for Cursor IDE):

```json
{
  "mysql": {
    "name": "MySQL Query MCP",
    "description": "MySQL read-only query access through MCP",
    "type": "bin", 
    "enabled": true,
    "bin": "mysql-query-mcp"
  }
}
```

For more advanced configuration with environment variables embedded in the MCP config:

```json
{
  "mysql": {
    "command": "npx",
    "args": ["mysql-query-mcp-server@latest"],
    "env": {
      "LOCAL_DB_HOST": "localhost",
      "LOCAL_DB_USER": "root",
      "LOCAL_DB_PASS": "<YOUR_LOCAL_DB_PASSWORD>",
      "LOCAL_DB_NAME": "your_database",
      "LOCAL_DB_PORT": "3306",
      
      "DEVELOPMENT_DB_HOST": "dev.example.com",
      "DEVELOPMENT_DB_USER": "<DEV_USER>",
      "DEVELOPMENT_DB_PASS": "<DEV_PASSWORD>",
      "DEVELOPMENT_DB_NAME": "your_database",
      "DEVELOPMENT_DB_PORT": "3306",
      
      "STAGING_DB_HOST": "staging.example.com",
      "STAGING_DB_USER": "<STAGING_USER>",
      "STAGING_DB_PASS": "<STAGING_PASSWORD>",
      "STAGING_DB_NAME": "your_database",
      "STAGING_DB_PORT": "3306",
      
      "PRODUCTION_DB_HOST": "prod.example.com",
      "PRODUCTION_DB_USER": "<PRODUCTION_USER>",
      "PRODUCTION_DB_PASS": "<PRODUCTION_PASSWORD>",
      "PRODUCTION_DB_NAME": "your_database",
      "PRODUCTION_DB_PORT": "3306",
      
      "DEBUG": "false",
      "MCP_MYSQL_SSL": "true",
      "MCP_MYSQL_REJECT_UNAUTHORIZED": "false"
    }
  }
}
```

#### Choosing the Right Configuration Approach

There are two ways to configure the MySQL MCP server:

1. **Binary Configuration** (`type: "bin"`, `bin: "mysql-query-mcp"`)
   - **When to use**: When you've installed the package globally (`npm install -g mysql-query-mcp-server`)
   - **Pros**: Simpler configuration, cleaner MCP file
   - **Cons**: Requires global installation, uses a separate `.env` file for database credentials

2. **Command Configuration** (`command: "npx"`, `args: ["mysql-query-mcp-server@latest"]`)
   - **When to use**: When you want to use the latest version without installing it globally
   - **Pros**: No global installation required, all configuration in one file
   - **Cons**: More complex configuration, credentials in MCP file (which may be preferred in some cases)

Choose the approach that best fits your workflow. Both methods will work correctly with any AI assistant that supports MCP.

**Important Configuration Notes:**
- You must use the full environment names: LOCAL_, DEVELOPMENT_, STAGING_, PRODUCTION_
- Abbreviations like DEV_ or PROD_ will not work
- Global settings like DEBUG, MCP_MYSQL_SSL apply to all environments
- At least one environment (typically "local") must be configured
- You only need to configure the environments you plan to use

### 2. Alternative: Using a .env File

If you prefer to keep your database credentials in a separate file, you can use a `.env` file:

```env
# Local Database
LOCAL_DB_HOST=localhost
LOCAL_DB_USER=root
LOCAL_DB_PASS=your_password
LOCAL_DB_NAME=your_database
LOCAL_DB_PORT=3306
LOCAL_DB_SSL=false

# Development Database (optional)
DEVELOPMENT_DB_HOST=dev.example.com
DEVELOPMENT_DB_USER=dev_user
DEVELOPMENT_DB_PASS=dev_password
DEVELOPMENT_DB_NAME=dev_database
DEVELOPMENT_DB_PORT=3306
DEVELOPMENT_DB_SSL=true

# Staging Database (optional)
STAGING_DB_HOST=staging.example.com
STAGING_DB_USER=staging_user
STAGING_DB_PASS=staging_password
STAGING_DB_NAME=staging_database
STAGING_DB_PORT=3306
STAGING_DB_SSL=true

# Production Database (optional)
PRODUCTION_DB_HOST=prod.example.com
PRODUCTION_DB_USER=prod_user
PRODUCTION_DB_PASS=prod_password
PRODUCTION_DB_NAME=prod_database
PRODUCTION_DB_PORT=3306
PRODUCTION_DB_SSL=true

# Debug Mode
DEBUG=false
```

You can copy the included `.env.example` file to get started:
```bash
cp .env.example .env
```

When using a `.env` file, your MCP configuration can be simplified to:

```json
{
  "mysql": {
    "name": "MySQL Query MCP",
    "description": "MySQL read-only query access through MCP",
    "type": "bin",
    "enabled": true,
    "bin": "mysql-query-mcp"
  }
}
```

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| DEBUG | Enable debug logging | false |
| [ENV]_DB_HOST | Database host for environment | - |
| [ENV]_DB_USER | Database username | - |
| [ENV]_DB_PASS | Database password | - |
| [ENV]_DB_NAME | Database name | - |
| [ENV]_DB_PORT | Database port | 3306 |
| [ENV]_DB_SSL | Enable SSL connection | false |
| MCP_MYSQL_SSL | Enable SSL for all connections | false |
| MCP_MYSQL_REJECT_UNAUTHORIZED | Verify SSL certificates | true |

## Integration with AI Assistants

Your AI assistant can interact with MySQL databases through the MCP server. Here are some examples:

Example queries:

```
Can you use the query tool to show me the first 10 users from the database? Use the local environment.
```

```
I need to analyze our sales data. Can you run a SQL query to get the total sales per region for last month from the development database?
```

```
Can you use the info tool to check what tables are available in the staging database?
```

```
Can you list all the available database environments we have configured?
```

### Using MySQL MCP Tools

The MySQL Query MCP server provides three main tools that your AI assistant can use:

#### 1. query

Execute read-only SQL queries against a specific environment:

```
Use the query tool to run:
SELECT * FROM customers WHERE signup_date > '2023-01-01' LIMIT 10;
on the development environment
```

#### 2. info

Get detailed information about your database:

```
Use the info tool to check the status of our production database.
```

#### 3. environments

List all configured environments from your `.env` file.

## Available Tools

The MySQL Query MCP server provides three main tools:

### 1. query

Execute read-only SQL queries:

```sql
-- Example query to run with the query tool
SELECT * FROM users LIMIT 10;
```

**Supported query types (strictly limited to)**:
- SELECT statements 
- SHOW commands
- DESCRIBE/DESC tables

### 2. info

Get detailed information about your database:

- Server version
- Connection status
- Database variables
- Process list
- Available databases

## Security Considerations

- ✅ Only read-only queries are allowed (SELECT, SHOW, DESCRIBE)
- ✅ Each environment has its own isolated connection pool
- ✅ SSL connections are supported for production environments
- ✅ Query timeouts prevent runaway operations
- ⚠️ Keep your `.env` file secure and never commit it to source control

### 3. environments

List all configured environments available in your setup. This tool will show all environments that have been successfully configured, either through:
- Environment variables in the MCP configuration
- A `.env` file in the project directory
- System environment variables

This is helpful for verifying which database environments are properly configured and available for querying.

## Troubleshooting

### Connection Issues

If you're having trouble connecting:

1. Verify your database credentials in `.env`
2. Ensure the MySQL server is running and accessible
3. Check for firewall rules blocking connections
4. Enable debug mode for detailed logs: `DEBUG=true mysql-query-mcp`

### Common Errors

**Error: No connection pool available for environment**
- Make sure you've defined all required environment variables for that environment
- Check that you're using one of the supported environment names (local, development, staging, production)

**Error: Query execution failed**
- Verify your SQL syntax
- Check that you're only using supported query types (SELECT, SHOW, DESCRIBE)
- Ensure your query is truly read-only

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[Abou Koné](https://github.com/devakone) - Engineering Leader and CTO

---

For more information or support, please [open an issue](https://github.com/devakone/mysql-query-mcp-server/issues) on the GitHub repository. 