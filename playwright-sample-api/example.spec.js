// example.spec.js
const { test, expect } = require('@playwright/test');

test('Playwright Page have the correct title', async ({ page }) => {
  // Buka situs Playwright
  await page.goto('https://playwright.dev/');

  // Cek judul halaman
  await expect(page).toHaveTitle(/Playwright/);

  // Cek ada teks "Getting Started"
  await expect(page.locator('text=Getting Started')).toBeVisible();
  await expect(page.locator('text=Learn Videos')).toBeVisible();
});