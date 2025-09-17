# Playwright + JavaScript

Author : 
Tito Irfan Wibisono - QA Engineer / SDET Engineer


Automation UI tests for https://www.saucedemo.com


## Scope
- Uses Playwright test runner
- Implements (Page Object Model)
- Covers Login with valid credentials (required)
- Adds extra sample flows (inventory smoke checks)


## Prerequisites
- Node.js


## Setup
```bash
# 1) Install dependencies
npm ci || npm install


# 2) Install browsers
npx playwright install --with-deps

# 3) Run Test
# Headless
npm test

# Headed mode for debugging
npm run test:headed

# UI mode (watch & debug)
npm run test:ui

# Generate HTML report (after a run)
npm run report