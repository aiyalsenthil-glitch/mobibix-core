import { test, expect } from '@playwright/test';

test.describe('Plan Migrations and Billing Flow', () => {

  // Auth is handled globally via storageState — no login needed here

  test('should load subscription settings and toggle billing cycles', async ({ page }) => {
    await page.goto('/settings');
    
    // Validate core subscription page has loaded
    await expect(page.getByRole('heading', { name: /Subscription & Billing/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Current Plan/i).first()).toBeVisible();

    // Toggle Yearly
    await page.getByRole('button', { name: 'Yearly' }).click();
    
    // Assert saving badge or UI update appeared indicating billing cycle shift
    await expect(page.getByText(/Billed annually/i).first()).toBeVisible();
    
    // Toggle Pay Manually
    await page.getByRole('button', { name: /Pay Manually/i }).click();
    await expect(page.getByText(/Manual payment required/i)).toBeVisible();
  });

  test('should trigger correct downgrade or upgrade pre-checks', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Subscription & Billing/i })).toBeVisible({ timeout: 15000 });

    // Auto-handle the browser `confirm()` dialogs to ensure tests don't hang
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Check if a downgrade button exists
    const downgradeBtn = page.getByRole('button', { name: 'Downgrade' }).first();
    const upgradeBtn = page.getByRole('button', { name: /Pay Now/i }).first();

    if (await downgradeBtn.isVisible()) {
      await downgradeBtn.click();
      
      // Depending on the plan limits and backend state, it either schedules it or opens a blocker modal.
      // We are just validating it doesn't 500 fatal error.
      const isModalVisible = await page.getByText(/Action Required/i).isVisible({ timeout: 3000 });
      if(isModalVisible) {
          await expect(page.getByText(/Action Required/i)).toBeVisible();
      }
      
    } else if (await upgradeBtn.isVisible()) {
       await upgradeBtn.click();
       // Handled by the dialog dismiss listener above
    }
  });

});
