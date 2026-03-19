export const API_BASE = 'http://localhost:3000';

// Mock auth headers for the MVP until real authentication is implemented
export const MOCK_AUTH_HEADERS = {
  'X-User-Id': '00000000-0000-0000-0000-000000000001',
  'X-User-Role': 'mho',
  'X-Municipality-Id': '00000000-0000-0000-0000-000000000002',
};

/**
 * A wrapper around the native fetch API that forces injection of simulated
 * auth headers and unwraps the { data: ... } response envelope.
 * 
 * Takes the SvelteKit `fetch` function (from load events) as the first param 
 * to ensure SSR compatibility.
 */
export async function apiClient<T>(
  svelteFetch: typeof fetch,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  
  // Inject simulated auth headers
  Object.entries(MOCK_AUTH_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await svelteFetch(url, {
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
    } catch (e) {
      // Body might not be JSON, fallback to status text
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  
  // Unwrap the `{ data: T }` envelope
  if ('data' in result) {
    return result.data as T;
  }
  
  // Fallback in case endpoint violates the envelope contract
  return result as T;
}
