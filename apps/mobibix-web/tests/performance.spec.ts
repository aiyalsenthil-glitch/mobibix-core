import { test, expect } from '@playwright/test';

test.describe('API Performance & Loading Benchmarks', () => {

  test('High-traffic endpoints must resolve within acceptable SLA thresholds', async ({ page }) => {
    // Auth is handled globally via storageState — start measuring immediately
    
    // Measure Customers page load speed  
    const startCustomersTime = Date.now();
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /Customers/i }).first()).toBeVisible({ timeout: 10000 });
    
    // SLA: < 8000ms (Dev mode Webpack compilation + Prisma queries)
    const customersLoadTime = Date.now() - startCustomersTime;
    expect(customersLoadTime).toBeLessThan(8000);

    // Measure Sales API loading SLA
    const startSalesTime = Date.now();
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: /Sales/i }).first()).toBeVisible({ timeout: 10000 });
    
    // SLA: < 8000ms (Dev mode Webpack compilation + SSR + Prisma)
    const salesLoadTime = Date.now() - startSalesTime;
    expect(salesLoadTime).toBeLessThan(8000);

    // Measure Settings/Billing page speed
    const startSettingsTime = Date.now();
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Subscription & Billing/i })).toBeVisible({ timeout: 10000 });
    
    const settingsLoadTime = Date.now() - startSettingsTime;
    expect(settingsLoadTime).toBeLessThan(8000);
  });
});
