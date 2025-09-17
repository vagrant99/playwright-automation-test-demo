const { BasePage } = require('./base.page');

class InventoryPage extends BasePage {
    constructor(page) {
        super(page);
        this.inventoryItems = page.locator('.inventory_item'); // data-test attribute using id : inventory_item
        this.cartBadge = page.locator('.shopping_cart_badge');  // data-test attribute using class : shopping_cart_badge
        this.cartLink = page.locator('#shopping_cart_container a'); // data-test attribute using id : shopping_cart_container a
    }

    itemByName(name) {
        const item = this.page.locator('.inventory_item').filter({ hasText: name });
        return {
            root: item,
            addButton: item.getByRole('button', { name: 'Add to cart' }),
            removeButton: item.getByRole('button', { name: 'Remove' })
        };
    }

    async openCart() {
        await this.cartLink.click();
    }
}

module.exports = { InventoryPage };