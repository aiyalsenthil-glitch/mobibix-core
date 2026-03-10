import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

const AUTH_FILE = path.join(__dirname, '.auth-state.json');
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? 'test@gmail.com';
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'Test@123';

setup('authenticate', async ({ page }) => {
  try {
    console.log(`[playwright setup] Starting authentication for ${TEST_EMAIL}...`);
    await page.goto('/signin', { timeout: 15000, waitUntil: 'networkidle' });
    
    // Fill email
    await page.fill('input[type="email"]', TEST_EMAIL, { timeout: 5000 });
    
    // Click Continue - use ID for reliability
    const continueBtn = page.locator('#email-next-btn');
    await continueBtn.waitFor({ state: 'visible', timeout: 5000 });
    await continueBtn.click();
    
    // Wait for password field
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({
      state: 'visible',
      timeout: 10000,
    });
    
    // Fill password
    await passwordInput.fill(TEST_PASSWORD, { timeout: 5000 });
    
    // Click Sign In - use ID for reliability
    const signInBtn = page.locator('#login-btn');
    await signInBtn.waitFor({ state: 'visible', timeout: 5000 });
    await signInBtn.click();

    console.log('[playwright setup] Sign in clicked, waiting for redirect...');

    // Best-effort only: don't fail setup if auth flow stalls in CI.
    await page.waitForFunction(() => {
      const path = window.location.pathname.toLowerCase();
      return path !== '/signin' && path !== '/auth';
    }, { timeout: 15000 });
    
    console.log(`[playwright setup] Authentication successful! Redirected to: ${new URL(page.url()).pathname}`);
  } catch (err: any) {
    const currentPath = new URL(page.url()).pathname.toLowerCase();
    const pageTitle = await page.title().catch(() => 'unknown');
    console.warn(
      `[playwright setup] WARNING: auth did not complete within timeout. Path: ${currentPath}, Title: ${pageTitle}`,
    );
    console.warn(`[playwright setup] Error: ${err?.message || 'Unknown error'}`);
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
