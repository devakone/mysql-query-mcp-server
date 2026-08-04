import { redact } from './security/secrets.js';

/**
 * All server logging goes through here so that every line passes through
 * redaction on its way to stderr. stderr is captured by the MCP client and
 * written to its log files, so it is not a safe place for credentials either.
 */

function write(level: string, scope: string, message: string, data?: unknown): void {
  const parts = [`[${new Date().toISOString()}]`, level, `[${scope}]`, message];

  if (data !== undefined) {
    try {
      parts.push(JSON.stringify(data));
    } catch {
      parts.push('[unserializable]');
    }
  }

  process.stderr.write(`${redact(parts.join(' '))}\n`);
}

/** Verbose tracing. Off unless DEBUG=true, because it is noisy by design. */
export function debug(scope: string, message: string, data?: unknown): void {
  if (process.env.DEBUG !== 'true') return;
  write('DEBUG', scope, message, data);
}

/** Operational problems the user should see. Always emitted. */
export function warn(scope: string, message: string, data?: unknown): void {
  write('WARN', scope, message, data);
}
