import { test, expect } from '@playwright/test';

test.describe('Shops Dashboard Flow', () => {
  // Auth is handled globally via storageState
  
  test('should navigate to shops and display modern UI components', async ({ page }) => {
    // Navigate directly to the Shops page
    await page.goto('/shops');
    
    // Verify the Shops heading exists
    const shopsHeading = page.getByRole('heading', { name: /Shops/i }).first();
    await expect(shopsHeading).toBeVisible({ timeout: 10000 });

    // Verify shop cards or empty state appears (wait for data to load)
    const cardsOrEmpty = page.getByText(/Manage Settings|Create Your First Shop/i).first();
    await expect(cardsOrEmpty).toBeVisible({ timeout: 10000 });
  });
});
