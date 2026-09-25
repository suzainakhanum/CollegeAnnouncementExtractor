import axios, { AxiosError } from 'axios';
import { NetworkError, RateLimitError, TimeoutError } from '../types/index';

/**
 * Sends a prompt to the configured AI provider and returns the raw response text.
 *
 * This is the ONLY module that communicates with the AI provider.
 * Replacing this file with one that exports the same function signature is
 * sufficient to switch AI providers — no other file needs to change.
 *
 * Requirements: 9.1, 9.2, 9.3, 2.5
 */
export async function complete(prompt: string): Promise<string> {
  const endpoint = process.env.AI_PROVIDER_ENDPOINT;
  const model = process.env.AI_MODEL_NAME;
  const apiKey = process.env.AI_API_KEY;

  if (!endpoint || !model || !apiKey) {
    throw new NetworkError(
      'AI provider is not configured. Required environment variables are missing.'
    );
  }

  const url = `${endpoint}/chat/completions`;

  try {
    const response = await axios.post(
      url,
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      },
      {
        timeout: 30_000, // 30-second request timeout (Requirement 2.5)
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    // Extract the response text from the OpenAI-compatible response shape.
    const content: string = response.data.choices[0].message.content;
    return content;
  } catch (err) {
    const axiosErr = err as AxiosError;

    // Timeout: axios sets code to 'ECONNABORTED' or 'ETIMEDOUT' when the
    // request exceeds the configured timeout.
    if (
      axiosErr.code === 'ECONNABORTED' ||
      axiosErr.code === 'ETIMEDOUT'
    ) {
      throw new TimeoutError(
        'The AI provider did not respond within the allowed time.'
      );
    }

    // No response received at all (DNS failure, refused connection, etc.).
    if (!axiosErr.response) {
      throw new NetworkError(
        'Could not reach the AI provider. Check network connectivity.'
      );
    }

    // HTTP 429 — provider rate limit exceeded.
    if (axiosErr.response.status === 429) {
      throw new RateLimitError(
        'The AI provider rate limit has been exceeded. Please try again later.'
      );
    }

    // Any other HTTP error (4xx other than 429, 5xx from provider, etc.).
    throw new NetworkError(
      `The AI provider returned an unexpected error (HTTP ${axiosErr.response.status}).`
    );
  }
}
