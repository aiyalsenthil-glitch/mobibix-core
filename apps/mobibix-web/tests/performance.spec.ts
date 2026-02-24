import { test, expect } from '@playwright/test';

test.describe('API Performance & Loading Benchmarks', () => {

  test('High-traffic endpoints must resolve within acceptable SLA thresholds', async ({ page }) => {
    // Auth is handled globally via storageState — start measuring immediately
    
    // Measure Dashboard reload speed
    await page.goto('/');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    const startDashboardTime = Date.now();
    await page.reload();
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
    
    // SLA: < 8000ms for SSR Dashboard + Prisma Analytics Aggregation (Dev Node Compiling)
    const dashboardLoadTime = Date.now() - startDashboardTime;
    expect(dashboardLoadTime).toBeLessThan(8000); 

    // Measure SPA navigation and API speed for Customers table
    const startCustomersTime = Date.now();
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: /Customers/i }).first()).toBeVisible({ timeout: 10000 });
    
    // SLA: < 8000ms for CSR Table Load + Pagination Queries (Dev mode compiles on-demand)
    const customersLoadTime = Date.now() - startCustomersTime;
    expect(customersLoadTime).toBeLessThan(8000);

    // Measure Sales API loading SLA
    const startSalesTime = Date.now();
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: /Sales/i }).first()).toBeVisible({ timeout: 10000 });
    
    // SLA: < 8000ms (Dev mode Webpack compilation + SSR + Prisma)
    const salesLoadTime = Date.now() - startSalesTime;
    expect(salesLoadTime).toBeLessThan(8000);
  });
});
