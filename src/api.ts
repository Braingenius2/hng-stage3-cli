import { loadCredentials, saveCredentials, clearCredentials } from './auth';

const API_BASE = process.env.INSIGHTA_API_URL || 'https://hng-stage3-backend-production.up.railway.app';

/**
 * Makes an authenticated request to the backend API.
 * Handles auto-refresh of expired access tokens.
 */
export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const creds = loadCredentials();
  if (!creds) {
    console.error('❌ Not logged in. Run: insighta login');
    process.exit(1);
  }

  const headers: Record<string, string> = {
    'X-API-Version': '1',
    'Authorization': `Bearer ${creds.access_token}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If we get a 401/403, try refreshing the token
  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshToken(creds.refresh_token);
    if (refreshed) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${refreshed.access_token}`;
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    } else {
      clearCredentials();
      console.error('❌ Session expired. Please run: insighta login');
      process.exit(1);
    }
  }

  return response;
}

async function refreshToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '1',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    if (data.status === 'success') {
      saveCredentials({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
