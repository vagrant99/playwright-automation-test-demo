const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/login.page');
const { users } = require('../utils/test-data');
const { InventoryPage } = require('../pages/inventory.page');
const { sleep } = require('../utils/delay');

// Tags: @logout

test('user can logout from menu', async ({ page }) => {
    // Arrange
    const login = new LoginPage(page);
    await login.open();
    await login.loginAs(users.valid.username, users.valid.password, 500);
    await expect(page).toHaveURL(/.*inventory.html/);

    // Act: open burger menu and click Logout
    await page.locator('#react-burger-menu-btn').click();
    await sleep(1000);
    await page.locator('#logout_sidebar_link').click();

    // Assert: back on login page
    await expect(page).toHaveURL(/.*saucedemo.com\/?$/);
    await sleep(1000);
    await expect(page.locator('#login-button')).toBeVisible();
});