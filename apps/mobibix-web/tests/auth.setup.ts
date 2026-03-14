import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

const AUTH_FILE = path.join(__dirname, '.auth-state.json');
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? 'test@gmail.com';

setup('authenticate', async ({ page }) => {
  console.log(`[playwright setup] Setting up mock auth for ${TEST_EMAIL}...`);

  // Inject a fake session cookie directly — no UI interaction, no Firebase calls.
  // All backend API calls in tests are mocked, so the cookie value doesn't matter;
  // we just need it present so the frontend auth state check (users/me) can succeed.
  await page.context().addCookies([
    {
      name: 'mobi_session_token',
      value: 'mock_ci_session_token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Mock /api/users/me so useAuth considers the user authenticated
  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock_user_id',
        email: TEST_EMAIL,
        fullName: 'Test User',
        role: 'OWNER',
        isSystemOwner: true,
        tenantId: 'mock_tenant_id',
        tenantCode: 'test-tenant',
        tenantType: 'MOBILE_SHOP',
        tenantName: 'Mock Tenant',
      }),
    });
  });

  // Persist auth state (cookie + any localStorage) for dependent test projects
  await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });
  const state = await page.context().storageState();
  await fs.writeFile(AUTH_FILE, JSON.stringify(state), 'utf8');

  console.log('[playwright setup] Mock auth state written successfully.');
});
