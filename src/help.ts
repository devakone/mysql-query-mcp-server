import fs from 'fs';
import path from 'path';

export function showHelp(): void {
  console.log(`
MySQL Query MCP Server
======================

A Model Context Protocol server for executing read-only MySQL queries.

Usage:
  mysql-query-mcp [options]

Options:
  --help, -h      Show this help message
  --version, -v   Show version information

Environment Variables:
  DEBUG                   Set to 'true' to enable debug logging
  LOCAL_DB_HOST           Local database hostname
  LOCAL_DB_USER           Local database username
  LOCAL_DB_PASS           Local database password
  LOCAL_DB_NAME           Local database name
  LOCAL_DB_SSL            Set to 'true' to enable SSL for local database
  
  DEVELOPMENT_DB_*        Development environment database settings
  STAGING_DB_*            Staging environment database settings
  PRODUCTION_DB_*         Production environment database settings

Examples:
  # Run with local database only
  LOCAL_DB_HOST=localhost LOCAL_DB_USER=root LOCAL_DB_PASS=password LOCAL_DB_NAME=mydb mysql-query-mcp

  # Run with debug mode enabled
  DEBUG=true mysql-query-mcp

  # Run with multiple environments
  LOCAL_DB_HOST=localhost LOCAL_DB_USER=root LOCAL_DB_PASS=password LOCAL_DB_NAME=localdb \\
  PRODUCTION_DB_HOST=prod.example.com PRODUCTION_DB_USER=admin PRODUCTION_DB_PASS=secure \\
  PRODUCTION_DB_NAME=proddb mysql-query-mcp
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