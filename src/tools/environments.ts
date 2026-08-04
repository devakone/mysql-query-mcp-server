import { z } from "zod";
import { Environment } from "../types/index.js";
import { credentialErrors, credentialSources, pools } from "../db/pools.js";
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
 * Reports which environments are usable. This response describes capability
 * only: environment names, how each password was obtained, and whether the
 * environment is ready to query. It must never carry configuration values.
 *
 * Resolution failure reasons are deliberately omitted. A resolver's error text
 * can quote whatever the underlying secret manager printed, and this response
 * goes into a chat transcript. Reasons are in the server log and in
 * `mysql-query-mcp doctor`. See src/security/guard.ts.
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
      credentialSource: credentialSources.get(env) ?? 'none',
      status: statusFor(env),
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

function statusFor(environment: Environment): string {
  if (pools.has(environment)) return 'ready';
  return credentialErrors.has(environment) ? 'credential-error' : 'unavailable';
}
