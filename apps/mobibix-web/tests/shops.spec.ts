import { test, expect } from '@playwright/test';

test.describe('Shops Dashboard Flow', () => {
  // Use sequential mode if needed, but test isolation is better.
  
  test('should login and navigate to shops successfully displaying modern UI components', async ({ page }) => {
    // Navigate to Login
    await page.goto('/signin');
    
    // Check if the page loaded
    await expect(page).toHaveURL(/.*signin/);
    
    // Fill credentials step 1 (Email)
    await page.fill('input[type="email"]', 'test@gmail.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // Fill credentials step 2 (Password)
    await page.locator('input[type="password"]').waitFor({ state: 'visible' });
    await page.fill('input[type="password"]', 'Test@123');
    
    // Submit form
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Wait for App to Redirect
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    
    // Ensure dashboard loads successfully
    const dashboardTitle = page.getByText(/Dashboard/i).first();
    await expect(dashboardTitle).toBeVisible();
    
    // Navigate strictly to the Shops page
    await page.goto('/shops');
    
    // Verify the newly styled Shops text exists
    const shopsHeading = page.locator('h1', { hasText: 'Shops' });
    await expect(shopsHeading).toBeVisible();

    // Verify grid or empty state appears (this confirms standard load worked)
    // Checking for either the Create Shop button OR the Manager Settings button on cards.
    const hasCards = await page.getByText('Manage Settings').count() > 0;
    const hasEmptyState = await page.getByText('Create Your First Shop').count() > 0;
    
    expect(hasCards || hasEmptyState).toBeTruthy();
  });
});
