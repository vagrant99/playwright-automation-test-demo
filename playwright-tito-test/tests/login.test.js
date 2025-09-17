const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/login.page');
const { users } = require('../utils/test-data');
const { sleep } = require('../utils/delay');
const { InventoryPage } = require('../pages/inventory.page');

// Tags: @login

test.describe('Authentication', () => {
    test('logs in with valid credentials - positive cases', async ({ page }) => {
        // Arrange
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // Act
        await loginPage.loginAs(users.valid.username, users.valid.password, 500);

        // Assert
        await expect(page).toHaveURL(/.*inventory.html/);
        await sleep(1000);
        await expect(page.getByText('Swag Labs')).toBeVisible();
    });


    test('shows error for locked out user - negative cases', async ({ page }) => {
        // Arrange
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // Act
        await loginPage.loginAs(users.locked.username, users.locked.password, 500);

        // Assert
        await expect(loginPage.error).toBeVisible();
        await sleep(1000);
        await expect(loginPage.error).toContainText('locked out');
    });

    test('rejects invalid password - negative cases', async ({ page }) => {
        // Arrange
        const loginPage = new LoginPage(page);
        await loginPage.open();

        // Act
        await loginPage.loginAs(users.invalid.username, users.invalid.password, 500);

        // Assert
        await expect(loginPage.error).toBeVisible();
        await sleep(1000);
        await expect(loginPage.error).toContainText('Username and password do not match');
    });
});