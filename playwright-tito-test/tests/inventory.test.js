const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/login.page');
const { users } = require('../utils/test-data');
const { sleep } = require('../utils/delay');
const { InventoryPage } = require('../pages/inventory.page');
// Tags: @inventory

test.describe('Inventory smoke', () => {
    test.beforeEach(async ({ page }) => {
        const login = new LoginPage(page);
        await login.open();
        await login.loginAs(users.valid.username, users.valid.password, 500);
        await sleep(1000);
        await expect(page).toHaveURL(/.*inventory.html/);
    });

    test('adds and removes a product from cart - inventory page', async ({ page }) => {
        // Arrange done in beforeEach

        // Act
        const firstItem = page.locator('.inventory_item').first();
        await sleep(1000);
        await firstItem.getByRole('button', { name: 'Add to cart' }).click();
        await sleep(1000);
        await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

        // Assert (remove)
        await firstItem.getByRole('button', { name: 'Remove' }).click();
        await sleep(1000);
        await expect(page.locator('.shopping_cart_badge')).toHaveCount(0);
    });
});