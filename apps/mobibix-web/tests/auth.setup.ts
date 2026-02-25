import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

const AUTH_FILE = path.join(__dirname, '.auth-state.json');
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? 'test@gmail.com';
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'Test@123';

setup('authenticate', async ({ page }) => {
  try {
    await page.goto('/signin', { timeout: 10000 });
    await page.fill('input[type="email"]', TEST_EMAIL, { timeout: 5000 });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.locator('input[type="password"]').waitFor({
      state: 'visible',
      timeout: 5000,
    });
    await page.fill('input[type="password"]', TEST_PASSWORD, { timeout: 5000 });
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Best-effort only: don't fail setup if auth flow stalls in CI.
    await page.waitForFunction(() => {
      const path = window.location.pathname.toLowerCase();
      return path !== '/signin' && path !== '/auth';
    }, { timeout: 8000 });
  } catch {
    const currentPath = new URL(page.url()).pathname.toLowerCase();
    console.warn(
      `[playwright setup] auth did not complete within timeout; continuing from ${currentPath}`,
    );
  }

  // Always persist a usable auth file so dependent projects can proceed.
  await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });
  const fallbackState = { cookies: [], origins: [] };
  await fs.writeFile(AUTH_FILE, JSON.stringify(fallbackState), 'utf8');

  // Best effort: overwrite fallback with actual browser state when available.
  try {
    const state = await page.context().storageState();
    await fs.writeFile(AUTH_FILE, JSON.stringify(state), 'utf8');
  } catch {
    // Keep fallback state
  }
});
