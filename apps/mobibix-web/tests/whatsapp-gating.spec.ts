import { test, expect } from '@playwright/test';

test.describe('WhatsApp CRM & RBAC Feature Gating', () => {
  // Auth is handled globally via storageState — no login needed here

  test('should block WhatsApp CRM access if tenant plan does not support it', async ({ page }) => {
    // Navigate strictly to the WhatsApp CRM dashboard
    await page.goto('/whatsapp');
    
    // We expect the FeatureGuard to intercept and display an upgrade prompt
    // Wait for the specific "Upgrade Required" or "Plan missing feature" UI
    const upgradeMessage = page.getByText(/Upgrade Required|Plan missing feature|Unlock WhatsApp/i).first();
    
    // Validate the gating works strictly
    await expect(upgradeMessage).toBeVisible({ timeout: 10000 });
    
    // Validate that the CTA routes to the billing/upgrade interface
    const upgradeCTA = page.getByRole('button', { name: /View Plans|Upgrade/i }).first();
    await expect(upgradeCTA).toBeVisible();
    await upgradeCTA.click();
    
    // Assert successful routing to Billing gateway
    await expect(page).toHaveURL(/.*billing.*/);
  });
});
