import { logger } from '@/libs/Logger';

/**
 * Pollinations AI is the LLM provider for all ONA agents.
 *
 * OpenAI-compatible endpoint: https://gen.pollinations.ai/v1
 * API keys are created at https://enter.pollinations.ai and stored as
 * POLLINATIONS_API_KEY.
 */
export const POLLINATIONS_API_URL = 'https://gen.pollinations.ai/v1/chat/completions';

/** Primary model for ONA agents: MiniMax M3.1 Flash (tool calling + reasoning). */
export const POLLINATIONS_DEFAULT_MODEL = 'minimax/minimax-m3.1-flash';

export const POLLINATIONS_FALLBACK_MODELS = [
  'minimax/minimax-m3',
  'minimax/minimax-m2.7',
];

/**
 * Anonymous-tier friendly auth headers. Pollinations works without a key
 * (rate-limited anonymous tier); set POLLINATIONS_API_KEY for higher limits.
 */
export function pollinationsAuthHeaders(): Record<string, string> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    logger.warn('POLLINATIONS_API_KEY not set — using the anonymous Pollinations tier.');
    return {};
  }
  return { Authorization: `Bearer ${apiKey}` };
}

/** Shared model fallback resolution for Pollinations calls. */
export function pollinationsModelChain(
  primary?: string | null,
  extraFallbacks?: string[],
): string[] {
  const chain = [
    primary?.trim() || null,
    process.env.POLLINATIONS_FALLBACK_MODELS?.split(',') ?? [],
    extraFallbacks ?? [],
    POLLINATIONS_FALLBACK_MODELS,
  ]
    .flat()
    .map(model => model?.trim())
    .filter((model): model is string => Boolean(model))
    .filter((model, index, models) => models.indexOf(model) === index);
  return chain.length > 0 ? chain : [POLLINATIONS_DEFAULT_MODEL];
}

/** Fetch a JSON completion from Pollinations with auth headers applied. */
export async function pollinationsChat(
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(POLLINATIONS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...pollinationsAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
}

/** Health probe: the model catalog is public, so this works without an API key. */
export async function checkPollinationsHealth(timeoutMs = 5000): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch('https://gen.pollinations.ai/v1/models', {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return { ok: false, message: `HTTP ${response.status}` };
    }
    return { ok: true, message: 'Model catalog reachable' };
  } catch (error) {
    logger.warn('Pollinations health check failed:', error);
    return { ok: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
