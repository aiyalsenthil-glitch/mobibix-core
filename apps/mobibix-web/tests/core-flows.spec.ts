import { test, expect } from '@playwright/test';

test.describe('Core Business Operations Flow', () => {
  // Auth is handled globally via storageState — no per-test login needed

  test('should navigate to customers page with existing session', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /Customers/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should create a new customer', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /Customers/i }).first()).toBeVisible({ timeout: 10000 });

    // Click Add Customer
    await page.getByRole('button', { name: /Add Customer/i }).click();

    // Wait for the full-screen modal overlay to appear
    const formOverlay = page.locator('.fixed.inset-0').first();
    await expect(formOverlay).toBeVisible({ timeout: 5000 });

    const uniquePhone = `9876${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Fill Customer Name (uses <input name="name">)
    await page.locator('input[name="name"]').fill('Playwright Test Customer');
    
    // Fill Phone (uses <input name="phone">)
    await page.locator('input[name="phone"]').fill(uniquePhone);
    
    // Select State (uses <select name="state">)
    await page.locator('select[name="state"]').selectOption('Tamil Nadu');

    // Submit — button text is "Add Customer"
    await page.getByRole('button', { name: 'Add Customer', exact: true }).click();

    // Wait for form to close (success)
    await expect(formOverlay).toBeHidden({ timeout: 10000 });
  });

  test('should navigate to sales page', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: /Sales/i }).first()).toBeVisible({ timeout: 10000 });

    // Verify the Create Invoice button is present
    const createBtn = page.getByRole('button', { name: /Create Invoice/i });
    await expect(createBtn).toBeVisible();
  });

  test('should navigate to inventory page', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /Inventory/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
