import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should allow a user to navigate to salons and open the booking modal', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to salons
    await page.click('text=سالن‌ها و خدمات');
    await expect(page).toHaveURL(/\/salons/);
    
    // Verify salon list is visible
    await expect(page.locator('h1')).toContainText('سالن‌ها و مراکز تخصصی');
    
    // Open booking modal for the first salon
    const bookButton = page.locator('button:has-text("رزرو نوبت قطعی")').first();
    await bookButton.click();
    
    // Verify booking modal is open
    await expect(page.locator('h3:has-text("فرم رزرو نوبت")')).toBeVisible();
    
    // Check if auth is required (ProtectedRoute logic)
    // In this app, ProtectedRoute triggers AuthModal if not logged in
    await expect(page.locator('h2:has-text("ورود به بویا")')).toBeVisible();
  });
});
