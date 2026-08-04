import fs from 'fs';
import path from 'path';

export function showHelp(): void {
  console.log(`
MySQL Query MCP Server
======================

A Model Context Protocol server for executing read-only MySQL queries.

Usage:
  mysql-query-mcp [options]
  mysql-query-mcp doctor
  mysql-query-mcp credentials set <environment>

Options:
  --help, -h      Show this help message
  --version, -v   Show version information

Commands:
  doctor                  Check every configured environment: which are complete,
                          where each password comes from, and whether it resolves.
                          Never prints a credential. Exits non-zero on failure.
  credentials set <env>   Store a password in the OS credential store and print
                          the config line to add. <env> is one of local,
                          development, staging, production.

Environment Variables:
  DEBUG                   Set to 'true' to enable debug logging
  LOCAL_DB_HOST           Local database hostname
  LOCAL_DB_USER           Local database username
  LOCAL_DB_NAME           Local database name
  LOCAL_DB_PORT           Local database port (default: 3306)
  LOCAL_DB_SSL            Set to 'true' to enable SSL for local database
  LOCAL_DB_PASS           Local database password, in plaintext
  LOCAL_DB_PASS_SOURCE    Where to read the password from, instead of storing it
                          in your config file. Preferred. Takes precedence over
                          LOCAL_DB_PASS.

  DEVELOPMENT_DB_*        Development environment database settings
  STAGING_DB_*            Staging environment database settings
  PRODUCTION_DB_*         Production environment database settings

Credential Sources (the value of <ENV>_DB_PASS_SOURCE):
  keychain://<service>/<account>   OS credential store. macOS Keychain, or
                                   libsecret on Linux. Not available on Windows.
  cmd:<command>                    Run a command, use its stdout. Works with any
                                   secret manager, for example:
                                     cmd:op read op://Infra/prod-mysql/password
                                     cmd:vault kv get -field=password kv/mysql
                                     cmd:aws secretsmanager get-secret-value \\
                                       --secret-id prod/mysql \\
                                       --query SecretString --output text
  aws-secrets://<id>[#key]         AWS Secrets Manager. Needs
                                   @aws-sdk/client-secrets-manager installed.
  aws-ssm://<name>                 SSM Parameter Store, decrypted. Needs
                                   @aws-sdk/client-ssm installed.
  env:<VARIABLE>                   Read another environment variable.

Examples:
  # Store the production password in your keychain, then point at it
  mysql-query-mcp credentials set production
  # -> "PRODUCTION_DB_PASS_SOURCE": "keychain://mysql-query-mcp/production"

  # Check what resolves, without starting the server
  mysql-query-mcp doctor

  # Run with local database only, password in plaintext (local development)
  LOCAL_DB_HOST=localhost LOCAL_DB_USER=root LOCAL_DB_PASS=password LOCAL_DB_NAME=mydb mysql-query-mcp

  # Run with debug mode enabled
  DEBUG=true mysql-query-mcp
  `);
  process.exit(0);
}

export function showVersion(): void {
  try {
    // Use process.cwd() to get the current working directory
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`mysql-query-mcp version ${packageJson.version}`);
  } catch (error) {
    console.log('mysql-query-mcp version unknown');
  }
  process.exit(0);
}

export function processCommandLineArgs(): void {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
  }
  
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    showVersion();
  }
} 
