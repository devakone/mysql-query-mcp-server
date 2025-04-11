import { z } from "zod";
import { Environment } from "../types/index.js";

export const environmentsToolName = "environments";
export const environmentsToolDescription = "List available MySQL database environments";
export const EnvironmentsToolSchema = z.object({});

function debug(message: string, ...args: any[]) {
  process.stderr.write(`DEBUG: ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}\n`);
}

// Map of environment to env var prefix
const ENV_PREFIX_MAP = {
  local: 'LOCAL',
  development: 'DEVELOPMENT',
  staging: 'STAGING',
  production: 'PRODUCTION'
} as const;

export async function runEnvironmentsTool(_params?: z.infer<typeof EnvironmentsToolSchema>): Promise<{ content: { type: string; text: string }[] }> {
  try {
    debug('=== Running environments tool ===');
    
    // Log all environment variables for debugging
    const envVars = Object.keys(process.env)
      .filter(key => key.includes('_DB_'))
      .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {});
    
    debug('Found DB-related environment variables:', envVars);
    
    const environments = Object.values(Environment.enum).filter(env => {
      const envPrefix = ENV_PREFIX_MAP[env];

      // Check only for required variables that pools.ts uses
      const hasConfig = !!(
        process.env[`${envPrefix}_DB_HOST`] &&
        process.env[`${envPrefix}_DB_USER`] &&
        process.env[`${envPrefix}_DB_NAME`]
      );

      debug(`Checking ${env} (${envPrefix}):`, {
        prefix: envPrefix,
        host: process.env[`${envPrefix}_DB_HOST`],
        user: process.env[`${envPrefix}_DB_USER`],
        db: process.env[`${envPrefix}_DB_NAME`],
        hasConfig
      });

      return hasConfig;
    });

    debug('Available environments:', environments);

    // Return the environments in the format expected by the MCP protocol
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          environments,
          count: environments.length,
          debug: {
            envVars,
            environments
          }
        }, null, 2),
      }],
    };
  } catch (error) {
    debug('Error in environments tool:', error);
    throw error;
  }
}
