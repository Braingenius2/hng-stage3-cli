import * as http from 'http';
import * as crypto from 'crypto';
import { saveCredentials } from './auth';

// PKCE helpers
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

const API_BASE = process.env.INSIGHTA_API_URL || 'https://hng-stage3-backend-production-345d.up.railway.app';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID';

export async function loginFlow(): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = base64URLEncode(crypto.randomBytes(16));

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:9876`);
        const code = url.searchParams.get('code');

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error: No authorization code received</h1>');
          return;
        }

        // Exchange the code with our backend
        const response = await fetch(`${API_BASE}/auth/github/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1',
          },
          body: JSON.stringify({ code, state, code_verifier: codeVerifier }),
        });

        const data = await response.json() as any;

        if (data.status === 'success' && data.access_token) {
          saveCredentials({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>✅ Login Successful!</h1><p>You can close this window and return to the terminal.</p>');
          console.log('\n✅ Login successful! Credentials saved to ~/.insighta/credentials.json');
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>❌ Login Failed</h1><p>${data.message || 'Unknown error'}</p>`);
          console.error('\n❌ Login failed:', data.message);
        }
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ Internal Error</h1>');
        console.error('\n❌ Error during login:', err.message);
      } finally {
        server.close();
        resolve();
      }
    });

    server.listen(9876, () => {
      const authUrl =
        `https://github.com/login/oauth/authorize` +
        `?client_id=${GITHUB_CLIENT_ID}` +
        `&redirect_uri=http://localhost:9876/callback` +
        `&scope=read:user user:email` +
        `&state=cli-${state}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;


      console.log('\n🔐 Opening GitHub for authentication...');
      console.log(`\nIf your browser doesn't open automatically, visit:\n${authUrl}\n`);

      // Try to open the browser
      import('open').then((mod) => mod.default(authUrl)).catch(() => {
        // If we can't open, the URL is printed above
      });
    });

    server.on('error', (err) => {
      console.error('❌ Could not start local server:', err.message);
      reject(err);
    });
  });
}
