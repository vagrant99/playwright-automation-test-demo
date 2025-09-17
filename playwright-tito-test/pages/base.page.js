class BasePage {
    /**
    * @param {import('@playwright/test').Page} page
    */
    constructor(page) {
        this.page = page;
    }


    async goto(path = '/') {
        await this.page.goto(path);
    }


    async waitForUrlContains(part) {
        await this.page.waitForURL(new RegExp(part));
    }
}


module.exports = { BasePage };