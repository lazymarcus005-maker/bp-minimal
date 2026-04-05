/**
 * API client helper that automatically includes passcode header (if needed) in requests
 * The actual passcode value will be injected by the API endpoint at request time
 */

export async function apiFetch(
  url: string,
  options?: RequestInit,
  passcode?: string
): Promise<Response> {
  const headers = new Headers(options?.headers);
  
  if (passcode) {
    headers.set('x-app-passcode', passcode);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
