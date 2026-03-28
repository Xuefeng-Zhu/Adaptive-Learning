import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

/**
 * Get the current access token from the client-side insforge SDK.
 * Returns the token string or null.
 */
export function getAccessToken(): string | null {
  const headers = insforge.getHttpClient().getHeaders();
  const auth = headers['Authorization'] || headers['authorization'];
  return auth?.replace('Bearer ', '') ?? null;
}
