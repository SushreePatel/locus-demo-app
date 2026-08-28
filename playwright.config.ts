import fs from 'fs';
import path from 'path';
import { defineConfig } from '@playwright/test';

// Parse .env file if present
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

process.env.CLASSIFIER_MODEL = process.env.CLASSIFIER_MODEL || 'gemini-2.5-flash-lite';
process.env.RESOLVER_MODEL   = process.env.RESOLVER_MODEL   || 'gemini-2.5-flash-lite';
process.env.HEAL_BUDGET       = process.env.HEAL_BUDGET       || '10';
process.env.GCP_PROJECT_ID   = process.env.GCP_PROJECT_ID   || 'locus-dev-506512';
process.env.GCP_REGION       = process.env.GCP_REGION       || 'us-central1';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,

  use: {
    baseURL: 'http://localhost:3002',
    // Locus reporter reads this screenshot attachment automatically.
    // Must be 'only-on-failure' — 'always' also works but wastes disk.
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
  },

  reporter: [
    // Human-readable output in the terminal
    ['list'],
    // Locus reporter fires on every failure and runs the pipeline in-process.
    // IMPORTANT: This path imports from the linked package's dist output.
    // The dist/ must exist in locus-self-healing — it was pre-built.
    [path.resolve('node_modules/locus-self-healing/dist/reporter/locus-reporter.js')],
  ],

  // Start the app server before tests run; tear it down after.
  webServer: {
    command: 'node app/server.js',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env['CI'],
    timeout: 10_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
