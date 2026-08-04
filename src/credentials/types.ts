import type { Environment } from "../types/index.js";

export interface ResolveContext {
  /** The environment being configured, for example "production". */
  environment: Environment;
  /** The env var prefix for that environment, for example "PRODUCTION". */
  envPrefix: string;
}

/**
 * Turns a reference into a password. The reference is whatever followed the
 * scheme in `<ENV>_DB_PASS_SOURCE`, with any leading `//` already stripped.
 *
 * A resolver either returns the secret or throws with a message safe to log.
 * It must never log or print the value itself.
 */
export type CredentialResolver = (reference: string, context: ResolveContext) => Promise<string>;

/** Where an environment's password came from, and whether it worked. */
export interface ResolvedCredential {
  /** Absent when there is no password configured, or resolution failed. */
  password?: string;
  /**
   * The scheme that produced it: "env", "keychain", "cmd", "aws-secrets",
   * "aws-ssm", or "none" when nothing is configured. Reported to callers, so it
   * must never contain a value.
   */
  source: string;
  /** Present when a configured source failed to resolve. Safe to log. */
  error?: string;
}
