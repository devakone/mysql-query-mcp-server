/**
 * Secret detection, used by the outbound tool-response guard and by the
 * redacting logger.
 *
 * Two independent strategies run together:
 *
 *  1. Value matching. Any process.env value whose *name* looks like a secret is
 *     treated as a literal string that must never appear in output. This is the
 *     load-bearing rule: it catches a leak regardless of what the leaking field
 *     is called or how it is nested.
 *  2. Shape matching. A short list of unmistakable secret shapes (AWS keys, PEM
 *     blocks, connection URIs with an embedded password) is caught even when the
 *     value did not come from this process's own environment.
 *
 * Deliberately NOT detected, because a real query result may legitimately
 * contain these and blocking them would break the tool:
 *
 *  - Hostnames and usernames by value. A `users` table has usernames in it.
 *  - Object keys merely named `password` / `secret` / `token`. `SELECT
 *    password_hash FROM users` is a query the user asked for; the row key is
 *    their schema, not our config.
 *  - Generic `password=...` text. Far too common inside real column data.
 *
 * The config-shaped-key rule below covers the case those looser rules were
 * meant to catch, without the false positives: no tool response has any reason
 * to contain a key like `PRODUCTION_DB_PASS`.
 */

/** Env var name fragments that mark that variable's value as a secret. */
const SECRET_NAME_PATTERN =
  /(PASS|PASSWD|PASSWORD|SECRET|TOKEN|CREDENTIAL|PRIVATE_KEY|APIKEY|API_KEY|ACCESS_KEY|SESSION)/i;

/**
 * Env var names shaped like this server's own database configuration, for
 * example `PRODUCTION_DB_PASS` or `LOCAL_DB_HOST`. No tool response may use one
 * of these as an object key.
 */
const CONFIG_KEY_PATTERN = /^[A-Z][A-Z0-9]*_DB_[A-Z_]+$/;

/** Values shorter than this are too common to match on without false positives. */
const MIN_SECRET_VALUE_LENGTH = 6;

const SHAPE_RULES: { rule: string; pattern: RegExp }[] = [
  { rule: 'aws-access-key-id', pattern: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/ },
  { rule: 'aws-secret-access-key', pattern: /\baws_secret_access_key\b/i },
  { rule: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { rule: 'private-key-block', pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/ },
  {
    rule: 'connection-uri-with-password',
    pattern:
      /\b(?:mysql|mysqlx|mariadb|postgres(?:ql)?|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:/@]+:[^\s@]+@/i,
  },
];

export interface SecretFinding {
  /** Stable identifier for the rule that fired. */
  rule: string;
  /** Human-readable detail. Never contains the matched value itself. */
  detail: string;
}

/**
 * Secrets that did not come from the environment, and so cannot be found by
 * scanning process.env: anything a credential provider resolved at startup from
 * a keychain, a helper command, or a cloud secrets manager.
 *
 * Without this, the guard and the logger would silently stop protecting
 * passwords the moment a user moved off plaintext env vars, which is exactly
 * the direction we want them to move.
 */
const registeredSecrets = new Set<string>();

/**
 * Marks a resolved credential as something that must never be emitted. Safe to
 * call more than once with the same value.
 */
export function registerSecret(value: string | undefined): void {
  if (!value || value.length < MIN_SECRET_VALUE_LENGTH) return;
  registeredSecrets.add(value);
}

/** Test seam. Production code never needs to forget a secret. */
export function clearRegisteredSecrets(): void {
  registeredSecrets.clear();
}

/**
 * Collects the literal values this process must never emit, keyed by where they
 * came from. Read fresh on every call so that tests and late-loaded
 * configuration are picked up.
 */
export function collectSecretValues(env: NodeJS.ProcessEnv = process.env): Map<string, string> {
  const values = new Map<string, string>();

  for (const [name, value] of Object.entries(env)) {
    if (!value || value.length < MIN_SECRET_VALUE_LENGTH) continue;
    if (!SECRET_NAME_PATTERN.test(name)) continue;
    values.set(name, value);
  }

  let index = 0;
  for (const value of registeredSecrets) {
    values.set(`resolved-credential-${++index}`, value);
  }

  return values;
}

/** Walks a parsed JSON value and reports every object key that names DB config. */
function findConfigKeys(value: unknown, path = '$', found: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findConfigKeys(item, `${path}[${index}]`, found));
    return found;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (CONFIG_KEY_PATTERN.test(key)) {
        found.push(`${path}.${key}`);
      }
      findConfigKeys(child, `${path}.${key}`, found);
    }
  }

  return found;
}

/**
 * Scans outbound text for secrets. Returns every finding rather than
 * short-circuiting, so the caller can report the full picture.
 */
export function scanForSecrets(text: string, env: NodeJS.ProcessEnv = process.env): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const [name, value] of collectSecretValues(env)) {
    if (text.includes(value)) {
      findings.push({
        rule: 'env-secret-value',
        detail: `contains the value of ${name}`,
      });
    }
  }

  for (const { rule, pattern } of SHAPE_RULES) {
    if (pattern.test(text)) {
      findings.push({ rule, detail: `matches the ${rule} pattern` });
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }

  if (parsed !== undefined) {
    for (const keyPath of findConfigKeys(parsed)) {
      findings.push({
        rule: 'configuration-key-in-response',
        detail: `exposes a configuration key at ${keyPath}`,
      });
    }
  }

  return findings;
}

function globalize(pattern: RegExp): RegExp {
  return pattern.flags.includes('g')
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);
}

/**
 * Replaces known secret values with a placeholder. Used on the logging path,
 * where the goal is a message that is still useful rather than a hard failure.
 */
export function redact(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let result = text;

  for (const [name, value] of collectSecretValues(env)) {
    result = result.split(value).join(`[REDACTED:${name}]`);
  }

  for (const { rule, pattern } of SHAPE_RULES) {
    result = result.replace(globalize(pattern), `[REDACTED:${rule}]`);
  }

  return result;
}
