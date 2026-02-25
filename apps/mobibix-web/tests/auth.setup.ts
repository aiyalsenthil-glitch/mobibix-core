import { test as setup } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth-state.json');
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? 'test@gmail.com';
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'Test@123';

setup('authenticate', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[type="password"]').waitFor({ state: 'visible' });
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();

  // Accept any authenticated landing route. Depending on tenant state it can be
  // /dashboard, /onboarding, or another app route.
  try {
    await page.waitForFunction(() => {
      const path = window.location.pathname.toLowerCase();
      return path !== '/signin' && path !== '/auth';
    }, { timeout: 20000 });
  } catch {
    const currentPath = new URL(page.url()).pathname.toLowerCase();
    console.warn(
      `[playwright setup] auth did not complete within timeout; continuing from ${currentPath}`,
    );
  }

  // Persist the full browser state (cookies, localStorage, sessionStorage)
  await page.context().storageState({ path: AUTH_FILE });
});
