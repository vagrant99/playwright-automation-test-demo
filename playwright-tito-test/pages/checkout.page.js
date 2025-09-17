const { BasePage } = require('./base.page');


class CheckoutPage extends BasePage {
    constructor(page) {
        super(page);
        this.firstName = page.locator('#first-name'); // data-test attribute using id : first-name
        this.lastName = page.locator('#last-name'); // data-test attribute using id : last-name
        this.postalCode = page.locator('#postal-code'); // data-test attribute using id : postal-code
        this.continueBtn = page.getByRole('button', { name: 'Continue' }); // data-test attribute using role : button, name : Continue
        this.finishBtn = page.getByRole('button', { name: 'Finish' }); // data-test attribute using role : button, name : Finish
        this.backHomeBtn = page.getByRole('button', { name: 'Back Home' }); // data-test attribute using role : button, name : Back Home
        this.completeHeader = page.locator('.complete-header'); // data-test attribute using class : complete-header
    }

    async fillInfo(first, last, postal) {
        await this.firstName.fill(first);
        await this.lastName.fill(last);
        await this.postalCode.fill(postal);
        await this.continueBtn.click();
    }

    async finishOrder() {
        await this.finishBtn.click();
    }
}

module.exports = { CheckoutPage };