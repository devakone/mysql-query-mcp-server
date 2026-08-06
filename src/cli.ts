import { createInterface } from "node:readline";
import { Environment } from "./types/index.js";
import { resolvePassword, CREDENTIAL_SCHEMES } from "./credentials/index.js";
import { DEFAULT_SERVICE, writeToKeychain } from "./credentials/keychain.js";

/**
 * Setup and diagnostic commands.
 *
 * These run instead of the MCP server and write to stdout, which is safe only
 * because the server is not running. Nothing here ever prints a credential.
 */

const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

/** Returns true when a subcommand ran, meaning the server should not start. */
export async function runSubcommand(argv: string[]): Promise<boolean> {
  const [command, ...rest] = argv;

  switch (command) {
    case 'doctor':
      await doctor();
      return true;
    case 'credentials':
      await credentials(rest);
      return true;
    default:
      return false;
  }
}

/**
 * Resolves every configured environment and reports what happened, without
 * starting the server or connecting to any database.
 */
async function doctor(): Promise<void> {
  const rows: string[][] = [['ENVIRONMENT', 'CONFIG', 'SOURCE', 'PASSWORD', 'DETAIL']];

  for (const environment of Object.values(Environment.enum)) {
    const envPrefix = ENV_PREFIX_MAP[environment];
    const hasHost = !!process.env[`${envPrefix}_DB_HOST`];
    const hasUser = !!process.env[`${envPrefix}_DB_USER`];
    const hasName = !!process.env[`${envPrefix}_DB_NAME`];
    const configured = hasHost && hasUser && hasName;

    if (!configured && !process.env[`${envPrefix}_DB_PASS_SOURCE`]) {
      rows.push([environment, 'not configured', '-', '-', '']);
      continue;
    }

    const missing = [
      !hasHost && `${envPrefix}_DB_HOST`,
      !hasUser && `${envPrefix}_DB_USER`,
      !hasName && `${envPrefix}_DB_NAME`,
    ].filter(Boolean);

    const credential = await resolvePassword({ environment, envPrefix });

    rows.push([
      environment,
      missing.length ? `missing ${missing.join(', ')}` : 'complete',
      credential.source,
      credential.error ? 'FAILED' : credential.password ? 'resolved' : 'none',
      credential.error ?? '',
    ]);
  }

  printTable(rows);

  const anyFailure = rows.slice(1).some((row) => row[3] === 'FAILED');
  const anyPlaintextProduction =
    process.env.PRODUCTION_DB_PASS && !process.env.PRODUCTION_DB_PASS_SOURCE;

  if (anyPlaintextProduction) {
    console.log(
      '\nWarning: production uses a plaintext password in PRODUCTION_DB_PASS.\n' +
        'Move it out of your config file with:\n' +
        '  mysql-query-mcp credentials set production',
    );
  }

  if (anyFailure) {
    console.log('\nOne or more credential sources failed. Those environments will be unavailable.');
    process.exitCode = 1;
  }
}

async function credentials(args: string[]): Promise<void> {
  const [action, target] = args;

  if (action !== 'set' || !target) {
    console.log(
      'Usage:\n' +
        '  mysql-query-mcp credentials set <environment>\n\n' +
        'Stores a password in the OS credential store and prints the config line to add.\n' +
        `Environments: ${Object.values(Environment.enum).join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const parsed = Environment.safeParse(target);
  if (!parsed.success) {
    console.error(
      `Unknown environment "${target}". Expected one of: ${Object.values(Environment.enum).join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const environment = parsed.data;
  const password = await promptHidden(`Password for ${environment}: `);

  if (!password) {
    console.error('No password entered, nothing stored.');
    process.exitCode = 1;
    return;
  }

  try {
    await writeToKeychain(DEFAULT_SERVICE, environment, password);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not write to the OS credential store: ${message}`);
    console.error(
      `\nAlternative: keep the password in your own secret manager and use the cmd: source.\n` +
        `Supported sources: ${CREDENTIAL_SCHEMES.map((s) => `${s}:`).join(' ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const envPrefix = ENV_PREFIX_MAP[environment];
  console.log(
    `\nStored. Add this to your MCP client config and remove ${envPrefix}_DB_PASS:\n\n` +
      `  "${envPrefix}_DB_PASS_SOURCE": "keychain://${DEFAULT_SERVICE}/${environment}"\n\n` +
      `Verify with: mysql-query-mcp doctor`,
  );
}

/** Reads a line from the terminal without echoing it. */
function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    const wasRaw = input.isTTY ? input.isRaw : false;

    const rl = createInterface({ input, output: process.stdout, terminal: true });

    // Suppress echo by overriding the readline output writer.
    const originalWrite = (rl as any)._writeToOutput;
    (rl as any)._writeToOutput = function (text: string) {
      if (text.includes(prompt)) {
        originalWrite.call(this, text);
      }
    };

    rl.question(prompt, (answer) => {
      rl.close();
      if (input.isTTY && !wasRaw) input.setRawMode?.(false);
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function printTable(rows: string[][]): void {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? '').length)),
  );

  for (const row of rows) {
    console.log(
      row
        .map((cell, column) => (cell ?? '').padEnd(widths[column]))
        .join('  ')
        .trimEnd(),
    );
  }
}
