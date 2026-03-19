import { SEED_IDS } from './constants';

export const API_BASE = 'http://localhost:3000';

/**
 * Auth headers injected on every request for MVP.
 */
const AUTH_HEADERS = {
  'X-User-Id': SEED_IDS.MHO_ID,
  'X-User-Role': 'mho',
  'X-Municipality-Id': SEED_IDS.MUNICIPALITY_ID,
} as const;

/**
 * Standalone fetch wrapper that:
 * 1. Injects simulated auth headers
 * 2. Unwraps the { data: ... } response envelope
 * 3. Throws with the server error message on failure
 *
 * Uses native fetch (client-side only — no SvelteKit fetch param needed
 * since all data fetching is now via TanStack Query on the client).
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Inject auth headers
  Object.entries(AUTH_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMsg = errorData.error;
      }
    } catch {
      // Body might not be JSON, fallback to status text
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();

  // Unwrap the `{ data: T }` envelope
  if ('data' in result) {
    return result.data as T;
  }

  // Fallback if endpoint doesn't use envelope
  return result as T;
}
