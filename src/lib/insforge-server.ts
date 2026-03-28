import { createClient } from '@insforge/sdk';
import type { NextRequest } from 'next/server';

/**
 * Create a server-side insforge client using the access token from the request.
 * Use this in API routes instead of the shared `insforge` singleton.
 */
export function createServerInsforge(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    edgeFunctionToken: token,
  });
}
