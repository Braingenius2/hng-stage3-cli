# Insighta CLI

Command-line tool for the Insighta Labs+ Profile Intelligence Platform.

## Installation

```bash
npm install -g .
```

## Usage

### Authentication
```bash
insighta login          # Authenticate via GitHub OAuth
insighta logout         # Clear stored credentials
insighta whoami         # Display current user info
```

### Profiles
```bash
insighta profiles list                              # List all profiles
insighta profiles list --gender male                # Filter by gender
insighta profiles list --country NG --age-group adult
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc
insighta profiles list --page 2 --limit 20

insighta profiles get <id>                          # Get single profile
insighta profiles search "young males from nigeria" # Natural language search
insighta profiles create --name "Harriet Tubman"    # Create profile (admin only)

insighta profiles export --format csv               # Export all profiles
insighta profiles export --format csv --gender male --country NG
```

## Credentials

Credentials are stored at `~/.insighta/credentials.json`.
