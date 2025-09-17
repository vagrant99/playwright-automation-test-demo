const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/login.page');
const { CartPage } = require('../pages/cart.page');
const { users } = require('../utils/test-data');
const { InventoryPage } = require('../pages/inventory.page');
const { sleep } = require('../utils/delay');

// Tags: @cart

const ITEM_NAME = 'Sauce Labs Backpack';

test('add item updates badge - remove clears it', async ({ page }) => {
    // Arrange
    const login = new LoginPage(page);
    await login.open();
    await login.loginAs(users.valid.username, users.valid.password, 500);
    await sleep(1000);
    await expect(page).toHaveURL(/.*inventory.html/);


    const inventory = new InventoryPage(page);

    // Act: add
    const item = inventory.itemByName(ITEM_NAME);
    await item.addButton.click();

    // Assert: badge shows 1
    await expect(inventory.cartBadge).toHaveText('1');

    // Go to cart and remove
    await inventory.openCart();
    const cart = new CartPage(page);
    await cart.removeItemByName(ITEM_NAME);

    // Badge disappears (no badge element when 0)
    await expect(inventory.cartBadge).toHaveCount(0);
});