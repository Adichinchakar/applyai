import { GoogleGenerativeAI } from '@google/generative-ai';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const MODELS = {
  smart: 'gemini-2.0-flash-lite', // scoring, cover letters, vision — separate quota bucket
  fast:  'gemini-2.0-flash-lite', // research, resume tailor
} as const;

/**
 * Retry a Gemini API call with exponential backoff on 429 rate limit errors.
 * Free tier: 15 RPM — retries handle transient quota bursts gracefully.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 5000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.includes('Too Many Requests');
      if (is429 && attempt < maxAttempts) {
        // Extract retry-after from error message if present, else use backoff
        const retryMatch = msg.match(/retry in (\d+(\.\d+)?)s/i);
        const waitMs = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1])) * 1000 + 1000
          : baseDelayMs * attempt;
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('withRetry: exhausted all attempts');
}
