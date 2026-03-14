import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, 'tests', '.auth-state.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost_REPLACED:3001',
    trace: 'on-first-retry',
  },
  projects: [
    // Setup project: runs FIRST, authenticates once
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 90000,
    },
    // Main tests: depend on setup, reuse its auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
});
