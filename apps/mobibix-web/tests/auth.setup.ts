import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth-state.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type="email"]', 'test@gmail.com');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[type="password"]').waitFor({ state: 'visible' });
  await page.fill('input[type="password"]', 'Test@123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });

  // Persist the full browser state (cookies, localStorage, sessionStorage)
  await page.context().storageState({ path: AUTH_FILE });
});
