import { Command } from 'commander';
import { loginFlow } from './login';
import { loadCredentials, clearCredentials } from './auth';
import { apiRequest } from './api';

const Table = require('cli-table3');
const ora = require('ora');
const chalk = require('chalk');

const program = new Command();

program
  .name('insighta')
  .description('CLI for Insighta Labs+ Profile Intelligence Platform')
  .version('1.0.0');

// ─── AUTH COMMANDS ──────────────────────────────────────────────

program
  .command('login')
  .description('Authenticate with GitHub OAuth')
  .action(async () => {
    await loginFlow();
  });

program
  .command('logout')
  .description('Clear stored credentials')
  .action(async () => {
    const creds = loadCredentials();
    if (creds) {
      const spinner = ora('Logging out...').start();
      try {
        await fetch(
          `${process.env.INSIGHTA_API_URL || 'https://hng-stage3-backend-production.up.railway.app'}/auth/logout`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Version': '1' },
            body: JSON.stringify({ refresh_token: creds.refresh_token }),
          }
        );
      } catch {
        // Server might be down, still clear local creds
      }
      clearCredentials();
      spinner.succeed('Logged out successfully.');
    } else {
      console.log('ℹ️  You are not currently logged in.');
    }
  });

program
  .command('whoami')
  .description('Display current user info')
  .action(async () => {
    const creds = loadCredentials();
    if (!creds) {
      console.log('❌ Not logged in. Run: insighta login');
      return;
    }

    // Decode the JWT payload to show user info
    try {
      const payload = JSON.parse(
        Buffer.from(creds.access_token.split('.')[1], 'base64').toString()
      );
      console.log(`\n👤 GitHub ID: ${payload.sub}`);
      console.log(`🔑 Role:      ${payload.role}`);
      console.log(`⏰ Expires:   ${new Date(payload.exp * 1000).toLocaleString()}\n`);
    } catch {
      console.log('❌ Could not decode token. Try logging in again.');
    }
  });

// ─── PROFILES COMMANDS ──────────────────────────────────────────

const profiles = program
  .command('profiles')
  .description('Manage profiles');

profiles
  .command('list')
  .description('List profiles with optional filters')
  .option('--gender <gender>', 'Filter by gender')
  .option('--country <country>', 'Filter by country ID')
  .option('--age-group <ageGroup>', 'Filter by age group')
  .option('--min-age <minAge>', 'Minimum age')
  .option('--max-age <maxAge>', 'Maximum age')
  .option('--sort-by <field>', 'Sort by field')
  .option('--order <order>', 'Sort order (asc/desc)')
  .option('--page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Items per page', '10')
  .action(async (opts: any) => {
    const spinner = ora('Fetching profiles...').start();
    try {
      const params = new URLSearchParams();
      if (opts.gender) params.append('gender', opts.gender);
      if (opts.country) params.append('country_id', opts.country);
      if (opts.ageGroup) params.append('age_group', opts.ageGroup);
      if (opts.minAge) params.append('min_age', opts.minAge);
      if (opts.maxAge) params.append('max_age', opts.maxAge);
      if (opts.sortBy) params.append('sort_by', opts.sortBy);
      if (opts.order) params.append('order', opts.order);
      params.append('page', opts.page);
      params.append('limit', opts.limit);

      const response = await apiRequest(`/api/profiles?${params.toString()}`);
      const data = await response.json();
      spinner.stop();

      if (!data.data || data.data.length === 0) {
        console.log('\nNo profiles found.\n');
        return;
      }

      displayProfilesTable(data.data);

      if (data.meta) {
        console.log(
          chalk.gray(
            `\nPage ${data.meta.page} of ${data.meta.total_pages} | Total: ${data.meta.total_elements} profiles`
          )
        );
      }
    } catch (err: any) {
      spinner.fail(`Failed to fetch profiles: ${err.message}`);
    }
  });

profiles
  .command('get <id>')
  .description('Get a single profile by ID')
  .action(async (id: string) => {
    const spinner = ora('Fetching profile...').start();
    try {
      const response = await apiRequest(`/api/profiles/${id}`);
      const data = await response.json();
      spinner.stop();

      if (data.data) {
        const p = data.data;
        console.log(`\n${chalk.bold('Profile Details')}`);
        console.log(`${'─'.repeat(40)}`);
        console.log(`  ID:                 ${p.id}`);
        console.log(`  Name:               ${p.name}`);
        console.log(`  Gender:             ${p.gender} (${(p.gender_probability * 100).toFixed(0)}%)`);
        console.log(`  Age:                ${p.age} (${p.age_group})`);
        console.log(`  Country:            ${p.country_name} [${p.country_id}] (${(p.country_probability * 100).toFixed(0)}%)`);
        console.log(`  Created:            ${p.created_at}\n`);
      } else {
        console.log('\n❌ Profile not found.\n');
      }
    } catch (err: any) {
      spinner.fail(`Failed: ${err.message}`);
    }
  });

profiles
  .command('search <query>')
  .description('Search profiles using natural language')
  .option('--page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Items per page', '10')
  .action(async (query: string, opts: any) => {
    const spinner = ora('Searching profiles...').start();
    try {
      const params = new URLSearchParams({
        q: query,
        page: opts.page,
        limit: opts.limit,
      });
      const response = await apiRequest(`/api/profiles/search?${params.toString()}`);
      const data = await response.json();
      spinner.stop();

      if (!data.data || data.data.length === 0) {
        console.log('\nNo profiles found matching your query.\n');
        return;
      }

      displayProfilesTable(data.data);

      if (data.meta) {
        console.log(
          chalk.gray(`\nPage ${data.meta.page} of ${data.meta.total_pages} | Total: ${data.meta.total_elements}`)
        );
      }
    } catch (err: any) {
      spinner.fail(`Search failed: ${err.message}`);
    }
  });

profiles
  .command('create')
  .description('Create a new profile (admin only)')
  .requiredOption('--name <name>', 'Full name for the profile')
  .action(async (opts: any) => {
    const spinner = ora('Creating profile...').start();
    try {
      const response = await apiRequest('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({ name: opts.name }),
      });
      const data = await response.json();
      spinner.stop();

      if (response.status === 201 || response.ok) {
        console.log(`\n✅ Profile created: ${data.data?.name || opts.name}\n`);
      } else {
        console.log(`\n❌ ${data.message || 'Failed to create profile'}\n`);
      }
    } catch (err: any) {
      spinner.fail(`Failed: ${err.message}`);
    }
  });

profiles
  .command('export')
  .description('Export profiles to CSV')
  .option('--format <format>', 'Export format', 'csv')
  .option('--gender <gender>', 'Filter by gender')
  .option('--country <country>', 'Filter by country ID')
  .option('--age-group <ageGroup>', 'Filter by age group')
  .option('--min-age <minAge>', 'Minimum age')
  .option('--max-age <maxAge>', 'Maximum age')
  .action(async (opts: any) => {
    const spinner = ora('Exporting profiles...').start();
    try {
      const params = new URLSearchParams();
      if (opts.gender) params.append('gender', opts.gender);
      if (opts.country) params.append('country_id', opts.country);
      if (opts.ageGroup) params.append('age_group', opts.ageGroup);
      if (opts.minAge) params.append('min_age', opts.minAge);
      if (opts.maxAge) params.append('max_age', opts.maxAge);

      const response = await apiRequest(`/api/profiles/export?${params.toString()}`);
      const csvData = await response.text();

      const filename = `profiles_${Date.now()}.csv`;
      const fs = require('fs');
      const path = require('path');
      const filepath = path.join(process.cwd(), filename);
      fs.writeFileSync(filepath, csvData);
      spinner.succeed(`Exported to ${filepath}`);
    } catch (err: any) {
      spinner.fail(`Export failed: ${err.message}`);
    }
  });

// ─── TABLE HELPER ──────────────────────────────────────────────

function displayProfilesTable(profiles: any[]) {
  const table = new Table({
    head: [
      chalk.cyan('Name'),
      chalk.cyan('Gender'),
      chalk.cyan('Age'),
      chalk.cyan('Country'),
      chalk.cyan('ID'),
    ],
    colWidths: [22, 10, 6, 10, 38],
  });

  for (const p of profiles) {
    table.push([
      p.name || '-',
      p.gender || '-',
      p.age ?? '-',
      p.country_id || '-',
      p.id || '-',
    ]);
  }

  console.log(`\n${table.toString()}`);
}

// ─── RUN ────────────────────────────────────────────────────────
program.parse(process.argv);
