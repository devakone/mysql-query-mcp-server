import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CredentialResolver } from "./types.js";

const run = promisify(execFile);

/** Long enough for a vault CLI to prompt for biometrics, short enough to fail. */
const TIMEOUT_MS = 30_000;

/**
 * Runs a command and uses its stdout as the password.
 *
 * This is the escape hatch that covers every secret manager without this
 * project taking a dependency on any of them: 1Password (`op read`), HashiCorp
 * Vault (`vault kv get`), `aws-vault`, `pass`, gopass, or a shell script.
 *
 * The command comes from the user's own MCP client config, which is the same
 * place the command that launches this server comes from. Anyone who can set it
 * can already run arbitrary code as this user, so running it is not a new
 * capability.
 */
export const resolveFromCommand: CredentialResolver = async (reference) => {
  const command = reference.trim();

  if (!command) {
    throw new Error('no command given, expected cmd:<command to run>');
  }

  const [file, args] = process.platform === 'win32'
    ? ['cmd.exe', ['/d', '/s', '/c', command]]
    : ['/bin/sh', ['-c', command]];

  try {
    const { stdout } = await run(file, args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 64,
      windowsHide: true,
    });

    // Trailing newlines are near universal in CLI output and are not part of
    // the secret. Interior whitespace is left alone.
    return stdout.replace(/\r?\n$/, '');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // stderr is included because it is usually the only clue ("not signed in",
    // "vault sealed"). Secret managers write the secret to stdout, not stderr.
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr ? `${detail}: ${stderr}` : detail);
  }
};
