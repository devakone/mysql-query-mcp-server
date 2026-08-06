import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CredentialResolver, ResolveContext } from "./types.js";

const run = promisify(execFile);

const TIMEOUT_MS = 30_000;

/** Default keychain service name, so `keychain:production` is enough. */
export const DEFAULT_SERVICE = 'mysql-query-mcp';

export interface KeychainRef {
  service: string;
  account: string;
}

/**
 * Accepts `keychain://service/account`, or `keychain:account` to use the default
 * service. The account defaults to the environment name.
 */
export function parseKeychainRef(reference: string, context: ResolveContext): KeychainRef {
  const trimmed = reference.trim().replace(/^\/+/, '');

  if (!trimmed) {
    return { service: DEFAULT_SERVICE, account: context.environment };
  }

  const separator = trimmed.indexOf('/');
  if (separator === -1) {
    return { service: DEFAULT_SERVICE, account: trimmed };
  }

  const service = trimmed.slice(0, separator);
  const account = trimmed.slice(separator + 1);

  return {
    service: service || DEFAULT_SERVICE,
    account: account || context.environment,
  };
}

/**
 * Reads a password from the OS credential store.
 *
 * Implemented by shelling out to the platform tool rather than by taking a
 * native dependency. `keytar` is unmaintained and would force a native build on
 * every install of what is otherwise a pure JavaScript package, which is a bad
 * trade for one lookup at startup.
 */
export const resolveFromKeychain: CredentialResolver = async (reference, context) => {
  const { service, account } = parseKeychainRef(reference, context);

  if (process.platform === 'darwin') {
    return readMacOSKeychain(service, account);
  }

  if (process.platform === 'linux') {
    return readLibsecret(service, account);
  }

  // Windows Credential Manager has no supported command-line reader for secret
  // values. cmdkey can create and delete entries but cannot print them, and
  // reading requires the CredRead API, which means a native module. Rather than
  // ship something half working, point at the escape hatch that does work.
  throw new Error(
    `the keychain: source is not supported on ${process.platform}. Use cmd: with a ` +
      `secret manager instead, for example ` +
      `cmd:powershell -Command "Get-Secret -Name ${account} -AsPlainText"`,
  );
};

async function readMacOSKeychain(service: string, account: string): Promise<string> {
  try {
    const { stdout } = await run(
      'security',
      ['find-generic-password', '-s', service, '-a', account, '-w'],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 64 },
    );
    return stdout.replace(/\r?\n$/, '');
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim() ?? '';

    if (stderr.includes('could not be found')) {
      throw new Error(
        `no keychain item for service "${service}" account "${account}". ` +
          `Create one with: mysql-query-mcp credentials set ${account}`,
      );
    }

    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

async function readLibsecret(service: string, account: string): Promise<string> {
  try {
    const { stdout } = await run(
      'secret-tool',
      ['lookup', 'service', service, 'account', account],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 64 },
    );

    const value = stdout.replace(/\r?\n$/, '');
    if (!value) {
      throw new Error(
        `no libsecret item for service "${service}" account "${account}". ` +
          `Create one with: mysql-query-mcp credentials set ${account}`,
      );
    }

    return value;
  } catch (error) {
    const code = (error as { code?: string | number }).code;

    if (code === 'ENOENT') {
      throw new Error(
        'secret-tool is not installed. Install libsecret-tools (Debian and Ubuntu) or ' +
          'libsecret (Fedora and Arch), or use the cmd: source with pass or another manager',
      );
    }

    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

/** Writes a password to the OS credential store. Used by the CLI, not at runtime. */
export async function writeToKeychain(
  service: string,
  account: string,
  password: string,
): Promise<void> {
  if (process.platform === 'darwin') {
    // -U updates an existing item rather than failing. Note that `security` takes
    // the password as an argument, so it is briefly visible in this machine's
    // process list. There is no stdin form of add-generic-password. The window is
    // milliseconds during an interactive one-off setup on the user's own machine.
    await run(
      'security',
      ['add-generic-password', '-s', service, '-a', account, '-w', password, '-U'],
      { timeout: TIMEOUT_MS },
    );
    return;
  }

  if (process.platform === 'linux') {
    await new Promise<void>((resolve, reject) => {
      const child = execFile(
        'secret-tool',
        ['store', '--label', `${service}:${account}`, 'service', service, 'account', account],
        { timeout: TIMEOUT_MS },
        (error) => (error ? reject(error) : resolve()),
      );
      // secret-tool reads the secret from stdin, which keeps it out of the
      // process argument list where other users could see it.
      child.stdin?.end(password);
    });
    return;
  }

  throw new Error(`writing to the OS credential store is not supported on ${process.platform}`);
}
