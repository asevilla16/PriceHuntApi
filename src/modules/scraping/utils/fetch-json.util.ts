const MAX_FETCH_ATTEMPTS = 3;

// Shared by every SupermarketStrategy: fetches a URL and parses it as JSON,
// retrying transient failures (network errors, non-2xx status) with a
// linear backoff before giving up.
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt < MAX_FETCH_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw new Error(
    `Failed to fetch "${url}" after ${MAX_FETCH_ATTEMPTS} attempts: ${lastError}`,
  );
}
