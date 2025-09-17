const { BasePage } = require('./base.page');
const { sleep } = require('../utils/delay');

class LoginPage extends BasePage {
    constructor(page) {
        super(page);
        // Create Locators
        this.username = page.locator('#user-name'); // data-test attribute using id : user-name
        this.password = page.locator('#password'); // data-test attribute using id : password
        this.loginBtn = page.locator('#login-button'); // data-test attribute using id : login-button
        this.error = page.locator('[data-test="error"]'); // data-test attribute using data-test : error
    }

    async open() {
        await this.goto('/');
        await sleep(1000);
    }

    async loginAs(user, pass) {
        await this.username.fill(user);
        await sleep(1000);
        await this.password.fill(pass);
        await sleep(1000);
        await this.loginBtn.click();
    }
}

module.exports = { LoginPage };