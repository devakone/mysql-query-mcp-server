import { scanForSecrets } from './secrets.js';
import { warn } from '../logging.js';

/**
 * Thrown instead of returning a response that contains something secret-shaped.
 * The message names the rules that fired and never includes the matched value.
 */
export class SecretLeakError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly rules: string[],
  ) {
    super(
      `Response from the "${toolName}" tool was blocked because it appeared to contain ` +
        `sensitive configuration (${rules.join(', ')}). This is a bug in the server, ` +
        `not a problem with your query. Please report it.`,
    );
    this.name = 'SecretLeakError';
  }
}

interface ToolResponse {
  content: { type: string; text: string }[];
}

/**
 * Last checkpoint before a tool response leaves the process.
 *
 * Anything returned here is written into the calling model's context and into a
 * saved transcript, so it leaves the machine the credentials were configured on.
 * That makes it a different trust boundary from the local config file, and this
 * is the boundary being enforced.
 *
 * Fails closed: a suspect response is dropped, not scrubbed and forwarded.
 * Scrubbing risks passing along a secret in a form the pattern did not quite
 * match, and a tool that silently returns altered data is worse than one that
 * reports an error.
 */
export function guardToolResponse<T extends ToolResponse>(toolName: string, response: T): T {
  const findings = response.content
    .filter((item) => typeof item.text === 'string')
    .flatMap((item) => scanForSecrets(item.text));

  if (findings.length > 0) {
    const rules = [...new Set(findings.map((finding) => finding.rule))];
    warn('guard', `blocked response from "${toolName}"`, {
      rules,
      details: findings.map((finding) => finding.detail),
    });
    throw new SecretLeakError(toolName, rules);
  }

  return response;
}
