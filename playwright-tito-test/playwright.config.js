// @ts-check
const { defineConfig, devices } = require('@playwright/test');


module.exports = defineConfig({
    testDir: './tests',
    timeout: 30 * 1000,
    retries: 1,
    fullyParallel: true,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'https://www.saucedemo.com',
        headless: true,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        { name: 'Chromium', use: { ...devices['Desktop Chrome '] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox '] } },
        { name: 'safari', use: { ...devices['Desktop Safari '] } }
    ]
});