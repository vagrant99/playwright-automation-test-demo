const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/login.page');
const { CartPage } = require('../pages/cart.page');
const { CheckoutPage } = require('../pages/checkout.page');
const { users, checkout } = require('../utils/test-data');
const { InventoryPage } = require('../pages/inventory.page');
const { sleep } = require('../utils/delay');

// Tags: @checkout

const ITEM_NAME = 'Sauce Labs Bike Light';

test('user can complete checkout - checkout page', async ({ page }) => {
    // Arrange
    const login = new LoginPage(page);
    await login.open();
    await login.loginAs(users.valid.username, users.valid.password, 500);
    await expect(page).toHaveURL(/.*inventory.html/);

    const inventory = new InventoryPage(page);

    // Act: add item and go to cart
    await inventory.itemByName(ITEM_NAME).addButton.click();
    await sleep(1000);
    await inventory.openCart();

    const cart = new CartPage(page);
    await cart.checkoutBtn.click();

    // Fill checkout info
    const co = new CheckoutPage(page);
    await co.fillInfo(checkout.firstName, checkout.lastName, checkout.postalCode, 500);

    // Assert overview page then finish
    await expect(page).toHaveURL(/.*checkout-step-two.html/);
    await co.finishOrder();

    // Assert completion
    await expect(co.completeHeader).toHaveText(/Thank you for your order!/i);
    await sleep(1000);
    await expect(co.backHomeBtn).toBeVisible();
});