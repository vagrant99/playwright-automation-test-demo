/**
 * Sample Test: Login Flow with Self-Healing Locators
 *
 * Target site : https://the-internet.herokuapp.com/login
 * Valid creds : tomsmith / SuperSecretPassword!
 *
 * Test strategy:
 *  - TC-01 uses CORRECT locators   → healer never triggered (baseline)
 *  - TC-02 uses BROKEN locators    → healer is triggered, Groq suggests fix
 *  - TC-03 re-uses broken locators → healer reads from cache (no LLM call)
 *  - TC-04 tests negative path     → wrong password → expect error message
 */

import { test, expect } from '../src/fixtures';

const BASE_URL = 'https://the-internet.herokuapp.com/login';

// ─── TC-01: Correct locators — healer NOT triggered ───────────────────────────

test('TC-01 | Login success with correct locators', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  // These are the REAL locators — healing never fires here
  await healPage.fill('#username', 'tomsmith');
  await healPage.fill('#password', 'SuperSecretPassword!');
  await healPage.click('button[type="submit"]');

  await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  console.log('\n  [TC-01] ✅ Passed — no healing needed');
});

// ─── TC-02: Broken locators — healer IS triggered ─────────────────────────────

test('TC-02 | Login success with BROKEN locators (self-heal triggered)', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  /**
   * These selectors are intentionally wrong.
   * The real IDs are: #username, #password, button[type="submit"]
   * Self-healer will detect failure, query Groq, and recover.
   */
  await healPage.fill('#user-name-input', 'tomsmith');           // ← broken
  await healPage.fill('#pass-word-field', 'SuperSecretPassword!'); // ← broken
  await healPage.click('#login-submit-button');                   // ← broken

  await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  console.log('\n  [TC-02] ✅ Passed — self-heal recovered broken locators');
});

// ─── TC-03: Same broken locators — should hit cache ───────────────────────────

test('TC-03 | Second run — healer reads from cache (no Groq call)', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  // Same broken locators as TC-02 → cache hit, no LLM call made
  await healPage.fill('#user-name-input', 'tomsmith');
  await healPage.fill('#pass-word-field', 'SuperSecretPassword!');
  await healPage.click('#login-submit-button');

  await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  console.log('\n  [TC-03] ✅ Passed — result served from cache');
});

// ─── TC-04: Negative path — wrong password ────────────────────────────────────

test('TC-04 | Login failure with wrong password', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  // Using correct locators, wrong password
  await healPage.fill('#username', 'tomsmith');
  await healPage.fill('#password', 'gishvagrantwashere');
  await healPage.click('button[type="submit"]');

  // Expect error flash message
  const flash = page.locator('#flash');
  await expect(flash).toBeVisible();
  await expect(flash).toContainText('Your password is invalid!');
  console.log('\n  [TC-04] ✅ Passed — error message verified correctly');
});
