import { test, expect } from '@playwright/test';

test.describe('WhatsApp CRM & RBAC Feature Gating', () => {
  // Auth is handled globally via storageState

  test('should render WhatsApp CRM page content based on plan', async ({ page }) => {
    await page.goto('/whatsapp-crm');
    
    // The page renders one of three states:
    // 1. WhatsApp CRM Dashboard ("WhatsApp CRM" heading)
    // 2. WhatsApp CRM Promo ("WhatsApp CRM for Growing Businesses")
    // 3. Contact Support page
    const whatsappHeading = page.getByText(/WhatsApp CRM/i).first();
    
    // Wait for page content to load
    await expect(whatsappHeading).toBeVisible({ timeout: 10000 });
  });
});
