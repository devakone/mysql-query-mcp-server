# MySQL Query MCP Server

A Model Context Protocol (MCP) server that provides **read-only** MySQL database queries for AI assistants like Claude in Cursor IDE, Windsurf, or Claude Desktop. Execute queries, explore database structures, and investigate your data directly from your AI-powered tools.

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

### 1. Configure Your Database Connections

You can configure the MySQL Query MCP server using environment variables in a `.env` file:

```env
# Local Database
LOCAL_DB_HOST=localhost
LOCAL_DB_USER=root
LOCAL_DB_PASS=your_password
LOCAL_DB_NAME=your_database
LOCAL_DB_SSL=false

# Development Database (optional)
DEVELOPMENT_DB_HOST=dev.example.com
DEVELOPMENT_DB_USER=dev_user
DEVELOPMENT_DB_PASS=dev_password
DEVELOPMENT_DB_NAME=dev_database
DEVELOPMENT_DB_SSL=true

# Staging Database (optional)
STAGING_DB_HOST=staging.example.com
STAGING_DB_USER=staging_user
STAGING_DB_PASS=staging_password
STAGING_DB_NAME=staging_database
STAGING_DB_SSL=true

# Production Database (optional)
PRODUCTION_DB_HOST=prod.example.com
PRODUCTION_DB_USER=prod_user
PRODUCTION_DB_PASS=prod_password
PRODUCTION_DB_NAME=prod_database
PRODUCTION_DB_SSL=true
```

**Important Notes**:
- You must configure at least one environment (typically "local")
- Environment names are fixed (local, development, staging, production)
- Additional environments can be configured but must use these exact names
- Only configure the environments you actually need

You can copy the included `.env.example` file to get started:
```bash
cp .env.example .env
```

### 2. Configure Cursor to Use the MCP Server

1. Create the `.cursor` directory in your home directory if it doesn't exist:
```bash
mkdir -p ~/.cursor
```

2. If you don't have an MCP configuration file yet, create one:
```bash
touch ~/.cursor/mcp.json
```

3. Add the MySQL Query MCP configuration to your `.cursor/mcp.json` file:
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

This tells Cursor to use the `mysql-query-mcp` binary when accessing the MySQL Query MCP server.

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| DEBUG | Enable debug logging | false |
| [ENV]_DB_HOST | Database host for environment | - |
| [ENV]_DB_USER | Database username | - |
| [ENV]_DB_PASS | Database password | - |
| [ENV]_DB_NAME | Database name | - |
| [ENV]_DB_SSL | Enable SSL connection | false |

## Integration with AI Assistants

### Cursor IDE

1. Open Cursor IDE
2. Ensure your `.cursor/mcp.json` file includes the MySQL Query MCP configuration
3. Start querying your databases with Claude!

Example query:
```
@Claude, can you show me the first 10 users from the database?
```

### Windsurf

1. Launch Windsurf browser
2. Configure the MySQL Query MCP extension with your database credentials
3. Start browsing with database access enabled

### Claude Desktop

1. Open Claude Desktop
2. Configure the MySQL Query MCP extension
3. Begin database interactions with Claude

## Available Tools

The MySQL Query MCP server provides three main tools:

### 1. Query Tool

Execute read-only SQL queries:

```sql
-- Example query
SELECT * FROM users LIMIT 10;
```

**Supported query types (strictly limited to)**:
- SELECT statements 
- SHOW commands
- DESCRIBE/DESC tables

### 2. Info Tool

Get detailed information about your database:

- Server version
- Connection status
- Database variables
- Process list
- Available databases

### 3. Environments Tool

List all configured environments from your `.env` file.

## Security Considerations

- ✅ Only read-only queries are allowed (SELECT, SHOW, DESCRIBE)
- ✅ Each environment has its own isolated connection pool
- ✅ SSL connections are supported for production environments
- ✅ Query timeouts prevent runaway operations
- ⚠️ Keep your `.env` file secure and never commit it to source control

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