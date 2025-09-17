const { BasePage } = require('./base.page');


class CartPage extends BasePage {
    constructor(page) {
        super(page);
        this.cartItems = page.locator('.cart_item'); // data-test attribute using class : cart_item
        this.checkoutBtn = page.getByRole('button', { name: 'Checkout' }); // data-test attribute using role : button, name : Checkout
    }

    async removeItemByName(name) {
        const row = this.page.locator('.cart_item').filter({ hasText: name });
        await row.getByRole('button', { name: 'Remove' }).click();
    }
}

module.exports = { CartPage };