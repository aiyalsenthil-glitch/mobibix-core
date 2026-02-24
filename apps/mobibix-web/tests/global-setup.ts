import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost_REPLACED:3001';
  
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Single login to Firebase — result cached for ALL tests
  await page.goto(`${baseURL}/signin`);
  await page.fill('input[type="email"]', 'test@gmail.com');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[type="password"]').waitFor({ state: 'visible' });
  await page.fill('input[type="password"]', 'Test@123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });

  // Persist cookies + localStorage into a JSON file
  await page.context().storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
export { STORAGE_STATE_PATH };
