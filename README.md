# MySQL Query MCP Server

[![npm version](https://img.shields.io/npm/v/mysql-query-mcp-server.svg)](https://www.npmjs.com/package/mysql-query-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides **read-only** MySQL database queries for AI assistants. Execute queries, explore database structures, and investigate your data directly from your AI-powered tools.

<a href="https://glama.ai/mcp/servers/@devakone/mysql-query-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@devakone/mysql-query-mcp-server/badge" alt="MySQL Query Server MCP server" />
</a>

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

### Configure Your AI Tool to Use the MCP Server

Create or edit your MCP configuration file (e.g., `.cursor/mcp.json` for Cursor IDE):

**Basic Configuration:**
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

**Comprehensive Configuration:**

Store each password where it belongs and point at it, so this file holds no
secrets and is safe to commit and share. Run `mysql-query-mcp credentials set
production` first to put the password in your OS keychain. See
[Credential Sources](#credential-sources).

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
      "DEVELOPMENT_DB_PASS_SOURCE": "keychain://mysql-query-mcp/development",
      "DEVELOPMENT_DB_NAME": "your_database",
      "DEVELOPMENT_DB_PORT": "3306",

      "STAGING_DB_HOST": "staging.example.com",
      "STAGING_DB_USER": "<STAGING_USER>",
      "STAGING_DB_PASS_SOURCE": "keychain://mysql-query-mcp/staging",
      "STAGING_DB_NAME": "your_database",
      "STAGING_DB_PORT": "3306",

      "PRODUCTION_DB_HOST": "prod.example.com",
      "PRODUCTION_DB_USER": "<PRODUCTION_USER>",
      "PRODUCTION_DB_PASS_SOURCE": "keychain://mysql-query-mcp/production",
      "PRODUCTION_DB_NAME": "your_database",
      "PRODUCTION_DB_PORT": "3306",

      "DEBUG": "false",
      "MCP_MYSQL_SSL": "true",
      "MCP_MYSQL_REJECT_UNAUTHORIZED": "false",
      "MYSQL_TIMEZONE": "Z"
    }
  }
}
```

Only `LOCAL_DB_PASS` is left as a plaintext password above, because a throwaway
local database password is not worth the ceremony. Everything else reads from the
keychain.

### Choosing the Right Configuration Approach

There are two ways to configure the MySQL MCP server:

1. **Binary Configuration** (`type: "bin"`, `bin: "mysql-query-mcp"`)
   - **When to use**: When you've installed the package globally (`npm install -g mysql-query-mcp-server`)
   - **Pros**: Simpler configuration
   - **Cons**: Requires global installation

2. **Command Configuration** (`command: "npx"`, `args: ["mysql-query-mcp-server@latest"]`)
   - **When to use**: When you want to use the latest version without installing it globally
   - **Pros**: No global installation required, all configuration in one file
   - **Cons**: More complex configuration

Choose the approach that best fits your workflow. Both methods will work correctly with any AI assistant that supports MCP.

### Important Configuration Notes

- You must use the full environment names: LOCAL_, DEVELOPMENT_, STAGING_, PRODUCTION_
- Abbreviations like DEV_ or PROD_ will not work
- Global settings like DEBUG, MCP_MYSQL_SSL apply to all environments
- At least one environment (typically "local") must be configured
- You only need to configure the environments you plan to use
- Use `[ENV]_DB_PASS_SOURCE` rather than `[ENV]_DB_PASS` for anything you care about, so no password is stored in this file. See [Credential Sources](#credential-sources)
- Run `mysql-query-mcp doctor` to check your configuration without starting the server
- DATETIME, DATE, and TIMESTAMP columns are returned as strings to preserve the exact value stored in MySQL without host timezone shifting

## Credential Sources

By default a password sits in plaintext in your MCP client config file, which
means that file cannot be committed, shared, or used as an example. Set
`[ENV]_DB_PASS_SOURCE` instead and the config holds only a reference. The
password is fetched once at startup and kept in memory.

### Quickest path: your OS keychain

```bash
mysql-query-mcp credentials set production
```

That prompts for the password (input is hidden), stores it in the macOS Keychain
or libsecret, and prints the line to add:

```json
"PRODUCTION_DB_PASS_SOURCE": "keychain://mysql-query-mcp/production"
```

Then remove `PRODUCTION_DB_PASS` from your config and check it worked:

```bash
mysql-query-mcp doctor
```

### All supported sources

| Source | Example | Notes |
|--------|---------|-------|
| `keychain:` | `keychain://mysql-query-mcp/production` | macOS Keychain, or libsecret on Linux. Not available on Windows, use `cmd:` there |
| `cmd:` | `cmd:op read op://Infra/prod-mysql/password` | Runs a command, uses its stdout. Covers every secret manager with no extra dependency |
| `aws-secrets:` | `aws-secrets://prod/mysql#password` | AWS Secrets Manager. `#password` reads that key out of a JSON secret. Requires `@aws-sdk/client-secrets-manager` |
| `aws-ssm:` | `aws-ssm:///prod/mysql/password` | SSM Parameter Store, decrypted. Requires `@aws-sdk/client-ssm` |
| `env:` | `env:SOME_OTHER_VAR` | Reads another environment variable. Mostly for CI |

`cmd:` is the most flexible and needs nothing installed beyond the tool you
already use:

```jsonc
// 1Password
"PRODUCTION_DB_PASS_SOURCE": "cmd:op read op://Infra/prod-mysql/password"

// HashiCorp Vault
"PRODUCTION_DB_PASS_SOURCE": "cmd:vault kv get -field=password kv/mysql/prod"

// AWS, using the CLI you already have, with no extra npm package
"PRODUCTION_DB_PASS_SOURCE": "cmd:aws secretsmanager get-secret-value --secret-id prod/mysql --query SecretString --output text"

// pass, on Linux
"PRODUCTION_DB_PASS_SOURCE": "cmd:pass show mysql/production"
```

The AWS SDK packages are not bundled, because they add roughly 11 MB for a
minority of users and the `cmd:` line above does the same job. Install one only
if you prefer the native source:

```bash
npm install -g mysql-query-mcp-server @aws-sdk/client-secrets-manager
```

### Behavior notes

- `[ENV]_DB_PASS_SOURCE` takes precedence over `[ENV]_DB_PASS`. If both are set
  the server warns and uses the source.
- A source that fails to resolve disables only its own environment. A broken
  production reference does not stop you querying local.
- Configuring `production` with a plaintext `PRODUCTION_DB_PASS` logs a warning
  on startup. It still works. Other environments are not nagged.
- Resolved passwords are registered with the same guard that protects
  environment variables, so they cannot appear in a tool response or a log line.
- Resolution happens once at startup. If a password changes, restart the server.

### Migrating from inline passwords

Existing configs keep working, so this can be done one environment at a time.

1. `mysql-query-mcp credentials set production`
2. Replace `"PRODUCTION_DB_PASS": "..."` with the `PRODUCTION_DB_PASS_SOURCE`
   line it prints.
3. `mysql-query-mcp doctor` to confirm it resolves.
4. Restart your AI tool so the MCP server picks up the new config.

Rotate any password that has been sitting in a config file, since it may be in
your shell history, an editor backup, or a previous chat transcript. See
[SECURITY.md](SECURITY.md).

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| DEBUG | Enable debug logging | false |
| [ENV]_DB_HOST | Database host for environment | - |
| [ENV]_DB_USER | Database username | - |
| [ENV]_DB_PASS | Database password, in plaintext. Prefer [ENV]_DB_PASS_SOURCE | - |
| [ENV]_DB_PASS_SOURCE | Where to read the password from. See [Credential Sources](#credential-sources) | - |
| [ENV]_DB_NAME | Database name | - |
| [ENV]_DB_PORT | Database port | 3306 |
| [ENV]_DB_SSL | Enable SSL connection | false |
| MCP_MYSQL_SSL | Enable SSL for all connections | false |
| MCP_MYSQL_REJECT_UNAUTHORIZED | Verify SSL certificates | true |
| MYSQL_TIMEZONE | Timezone mysql2 uses when sending JavaScript Date values in queries | Z |

### Date and Time Values

MySQL DATETIME, DATE, and TIMESTAMP columns are returned as raw strings, for example `2026-05-13 16:12:08`. This preserves the exact stored value and prevents the Node host timezone from shifting results during JSON serialization.

`MYSQL_TIMEZONE` defaults to `Z` (UTC). Override it only if your application intentionally sends JavaScript `Date` objects to MySQL using a different connection timezone.

Callers that already handle date/time values as strings do not need to change. Callers that previously expected JavaScript `Date` objects from this MCP server should parse the returned string explicitly.

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

List all configured environments from your configuration:

```
Use the environments tool to show me which database environments are available.
```

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
- Connection status and uptime
- Selected server variables (character set, timezone, timeouts, connection limits)
- Connection counters (threads connected, threads running, query counts)
- Available databases

The full `SHOW VARIABLES` output and the server process list are deliberately not
reported. See [SECURITY.md](SECURITY.md).

### 3. environments

List all configured environments from your configuration:

```
Use the environments tool to show me which database environments are available.
```

Returns the environment name, where its password came from, and whether it is
ready to query:

```json
{
  "environments": [
    { "name": "local", "credentialSource": "env", "status": "ready" },
    { "name": "production", "credentialSource": "keychain", "status": "ready" }
  ],
  "count": 2
}
```

A `status` of `credential-error` means the credential source failed. The reason
is deliberately not included here, because it can quote output from your secret
manager and this response goes into a chat transcript. Run
`mysql-query-mcp doctor` or check the server log for the reason.

## Command Line

```bash
mysql-query-mcp doctor                      # check config and credential sources
mysql-query-mcp credentials set production  # store a password in the OS keychain
mysql-query-mcp --help                      # all options and credential sources
mysql-query-mcp --version
```

`doctor` reports every environment, which are complete, where each password
comes from, and whether it resolves. It never prints a credential and exits
non-zero if any source failed, so it is usable in a setup script.

## Security Considerations

- ✅ Only read-only queries are allowed (SELECT, SHOW, DESCRIBE)
- ✅ Each environment has its own isolated connection pool
- ✅ SSL connections are supported for production environments
- ✅ Query timeouts prevent runaway operations
- ✅ Tool responses never include configuration values, and are checked for secrets before
  being returned
- ✅ Passwords can be read from your OS keychain, a secret manager, or AWS instead of being
  stored in your config file. See [Credential Sources](#credential-sources)
- ⚠️ If you use plaintext `[ENV]_DB_PASS`, keep that config file out of version control

### If you used a version before 1.3.0

Versions up to and including 1.2.2 returned database credentials in the `environments`
tool response, which means they could have been written into an AI chat transcript.
**Rotate any credential you configured through this server.** Details are in
[SECURITY.md](SECURITY.md).

## Troubleshooting

### Connection Issues

If you're having trouble connecting:

1. Verify your database credentials in your MCP configuration
2. Ensure the MySQL server is running and accessible
3. Check for firewall rules blocking connections
4. Enable debug mode by setting DEBUG=true in your configuration

### Common Errors

**Error: No connection pool available for environment**
- Make sure you've defined all required environment variables for that environment
- Check that you're using one of the supported environment names (local, development, staging, production)

**Error: Query execution failed**
- Verify your SQL syntax
- Check that you're only using supported query types (SELECT, SHOW, DESCRIBE)
- Ensure your query is truly read-only

For more comprehensive troubleshooting, see the [Troubleshooting Guide](docs/TROUBLESHOOTING.md).

For examples of how to integrate with AI assistants, see the [Integration Examples](docs/INTEGRATION_EXAMPLE.md).

For implementation details about the MCP protocol, see the [MCP README](docs/MCP_README.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## CI/CD and Release Process

This project uses GitHub Actions for continuous integration and automated releases.

### CI/CD Workflow

The CI/CD pipeline consists of:

1. **Build and Test**: Runs on every push to `main` and `develop` branches, and on pull requests to these branches
   - Tests the codebase with Node.js 16.x and 18.x
   - Ensures the package builds correctly
   - Validates all tests pass

2. **Release**: Runs when changes are pushed to the `main` branch and the build/test job succeeds
   - Uses `release-please` to manage version bumps and changelog updates
   - Creates a release PR with version changes based on conventional commits
   - Automatically publishes to npm when a release PR is merged

### Release Process

The project follows [Semantic Versioning](https://semver.org/):
- **Major version**: Breaking changes (non-backward compatible)
- **Minor version**: New features (backward compatible)
- **Patch version**: Bug fixes and minor improvements

Commits should follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat: add new feature` - Minor version bump
- `fix: resolve bug` - Patch version bump
- `docs: update documentation` - No version bump
- `chore: update dependencies` - No version bump
- `BREAKING CHANGE: change API` - Major version bump

When you push to `main`, `release-please` will analyze commits and automatically create or update a release PR with appropriate version bumps and changelog entries.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

[Abou Koné](https://github.com/devakone) - Engineering Leader and CTO

---

For more information or support, please [open an issue](https://github.com/devakone/mysql-query-mcp-server/issues) on the GitHub repository.
