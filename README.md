# Insighta CLI

A powerful, high-performance command-line interface for the Insighta Labs+ platform, designed for rapid data analysis and profile management.

## Installation
```bash
# Clone the repo and install globally
npm install -g .
```

## Security
- **Auth Flow**: Uses OAuth 2.0 with **PKCE** (Proof Key for Code Exchange) for secure authentication in public clients.
- **Credential Storage**: Tokens are stored securely in `~/.insighta/credentials.json`.
- **Token Management**: Automatic background refresh for seamless long-running sessions.

## Command Reference

### 🔐 Authentication
- `insighta login` — Interactive OAuth login flow via browser.
- `insighta whoami` — Display current user ID and role.
- `insighta logout` — Revoke session and clear local tokens.

### 👥 Profile Management
- `insighta profiles list` — Browse profiles with pagination.
  - `--gender`, `--country`, `--age-group` (Filters)
  - `--sort-by`, `--order` (Sorting)
  - `--page`, `--limit` (Pagination)
- `insighta profiles get <id>` — View full details of a specific profile.
- `insighta profiles search "..."` — Natural language query parsing.
- `insighta profiles create` — Create a new entry (**Admin only**).
- `insighta profiles export` — Download entire dataset in CSV format.

## Environment Config
- `INSIGHTA_API_URL`: Override the default API endpoint.
- `GITHUB_CLIENT_ID`: Override the default OAuth client.

## Troubleshooting (Windows)
If you get `bash: insighta: command not found` after installing:
1. Close and reopen your terminal.
2. If it still fails, use `node dist/index.js` as a prefix:
   ```bash
   node dist/index.js login
   ```
3. Ensure you have run `npm run build` before installing.
