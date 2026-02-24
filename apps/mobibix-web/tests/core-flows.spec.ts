import { test, expect } from '@playwright/test';

test.describe('Core Business Operations Flow', () => {
  // Use sequential execution because we are relying on state creation
  // Auth is handled globally via storageState — no per-test login needed

  test('should navigate to dashboard with existing session', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();

    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /Customers/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should create a new customer', async ({ page }) => {
    // Navigate to customers page
    await page.goto('/customers');
    await expect(page.locator('h1', { hasText: 'Customers' })).toBeVisible();

    // Click Add Customer
    await page.getByRole('button', { name: '+ Add Customer' }).click();

    // Fill Modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const uniquePhone = `9876${Math.floor(100000 + Math.random() * 900000)}`;
    await modal.getByLabel(/Name/i).fill('Playwright Test Customer');
    await modal.getByLabel(/Phone/i).fill(uniquePhone);
    await modal.getByLabel(/State/i).fill('Delhi');

    // Submit
    await modal.getByRole('button', { name: 'Save Customer' }).click();

    // Wait for success
    await expect(modal).toBeHidden();
    await expect(page.getByText(uniquePhone)).toBeVisible();
  });

  test('should add a new inventory product', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('h1', { hasText: 'Inventory' })).toBeVisible();

    // Click Add Product
    await page.getByRole('button', { name: '+ Add Product' }).click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const uniqueCode = `TEST-PRD-${Date.now()}`;
    await modal.getByLabel(/Product Name/i).fill('Playwright Auto Item');
    await modal.getByLabel(/SKU/i).fill(uniqueCode);
    await modal.getByLabel(/Selling Price/i).fill('1500');
    await modal.getByLabel(/Cost Price/i).fill('1000');

    await modal.getByRole('button', { name: 'Save Product' }).click();
    await expect(modal).toBeHidden();
    await expect(page.getByText(uniqueCode)).toBeVisible();
  });

  test('should generate a new sales invoice', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.locator('h1', { hasText: 'Sales Invoice' })).toBeVisible();

    await page.getByRole('button', { name: '+ New Sale' }).click();

    // Let the cart component load
    await expect(page.getByText(/Select Customer/i)).toBeVisible();

    // Search for the customer created previously
    const customerSearch = page.getByPlaceholder(/Search customers/i);
    await customerSearch.fill('Playwright Test Customer');
    // Select the first result
    await page.getByText('Playwright Test Customer').first().click();

    // Search for product broadly
    const productSearch = page.getByPlaceholder(/Search products/i);
    await productSearch.fill('Playwright Auto Item');
    await page.getByText('Playwright Auto Item').first().click();

    // Complete Sale
    await page.getByRole('button', { name: /Complete Sale/i }).click();

    // Expect Invoice Success Modal or redirection
    await expect(page.getByText(/Invoice Generated/i)).toBeVisible();
  });
});
