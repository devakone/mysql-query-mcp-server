import { z } from "zod";
import { Environment } from "../types/index.js";
import { debug } from "../logging.js";

export const environmentsToolName = "environments";
export const environmentsToolDescription = "List available MySQL database environments";
export const EnvironmentsToolSchema = z.object({});

// Map of environment to env var prefix
const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

/**
 * Describes where an environment's password came from. Naming the mechanism is
 * capability information, not a secret, and it tells the user which
 * environments are configured which way.
 */
function credentialSourceFor(envPrefix: string): string {
  return process.env[`${envPrefix}_DB_PASS`] ? 'env' : 'none';
}

/**
 * Reports which environments are usable. This response describes capability
 * only: environment names and how each one was configured. It must never carry
 * configuration values. See src/security/guard.ts.
 */
export async function runEnvironmentsTool(
  _params?: z.infer<typeof EnvironmentsToolSchema>,
): Promise<{ content: { type: string; text: string }[] }> {
  debug('environments', 'listing configured environments');

  const environments = Object.values(Environment.enum)
    .filter((env) => {
      const envPrefix = ENV_PREFIX_MAP[env];

      // Check only for required variables that pools.ts uses.
      return !!(
        process.env[`${envPrefix}_DB_HOST`] &&
        process.env[`${envPrefix}_DB_USER`] &&
        process.env[`${envPrefix}_DB_NAME`]
      );
    })
    .map((env) => ({
      name: env,
      credentialSource: credentialSourceFor(ENV_PREFIX_MAP[env]),
    }));

  debug('environments', 'available environments', environments.map((env) => env.name));

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        environments,
        count: environments.length,
      }, null, 2),
    }],
  };
}
