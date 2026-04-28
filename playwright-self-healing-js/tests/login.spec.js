'use strict';

/**
 * ============================================================
 *  Self-Healing Playwright — Sample Test Suite
 *  Target  : https://the-internet.herokuapp.com/login
 *  Creds   : tomsmith / SuperSecretPassword!
 * ============================================================
 *
 *  TC-01  Locator BENAR     → healer tidak jalan (baseline)
 *  TC-02  Locator RUSAK     → Groq dipanggil, locator di-recover
 *  TC-03  Locator RUSAK     → cache hit, Groq tidak dipanggil
 *  TC-04  Password SALAH    → verifikasi error message
 * ============================================================
 */

const { test, expect } = require('../src/fixtures');

const BASE_URL = 'https://the-internet.herokuapp.com/login';

// ── TC-01 ─────────────────────────────────────────────────────────────────────
test('TC-01 | Login berhasil dengan locator BENAR', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  // Locator asli yang valid — healer tidak pernah dipanggil
  await healPage.fill('#username', 'tomsmith');
  await healPage.fill('#password', 'SuperSecretPassword!');
  await healPage.click('button[type="submit"]');

  await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  console.log('\n  [TC-01] ✅ Passed — no healing needed');
});

// ── TC-02 ─────────────────────────────────────────────────────────────────────
test('TC-02 | Login berhasil dengan locator RUSAK (Groq dipanggil)', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  /**
   * Selector berikut sengaja salah.
   * ID yang benar: #username, #password, button[type="submit"]
   *
   * Alur yang terjadi:
   *  1. waitFor('#user-name-input', 3s) → timeout → masuk catch
   *  2. healLocator dipanggil
   *  3. extractDomSnapshot → kirim ke Groq
   *  4. Groq suggest locator → confidence check
   *  5. Jika lolos → action di-retry dengan locator baru
   *  6. Cache ditulis
   */
  await healPage.fill('#user-name-input',  'tomsmith');             // ← broken
  await healPage.fill('#pass-word-field',  'SuperSecretPassword!'); // ← broken
  await healPage.click('#login-submit-btn');                        // ← broken

  await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  console.log('\n  [TC-02] ✅ Passed — locator rusak berhasil di-recover oleh Groq');
});

// ── TC-03 ─────────────────────────────────────────────────────────────────────
test('TC-03 | Second run — hasil dari cache (Groq tidak dipanggil)', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  /**
   * Selector sama dengan TC-02.
   * Karena TC-02 sudah menulis healing-cache.json,
   * TC-03 langsung pakai hasil cache — tidak ada Groq call.
   */
  await healPage.fill('#user-name-input',  'tomsmith');
  await healPage.fill('#pass-word-field',  'SuperSecretPassword!');
  await healPage.click('#login-submit-btn');

  await expect(page.getByText('You logged into a secure area!')).toBeVisible();
  console.log('\n  [TC-03] ✅ Passed — locator recovered dari cache, no LLM call');
});

// ── TC-04 ─────────────────────────────────────────────────────────────────────
test('TC-04 | Login gagal dengan password salah', async ({ page, healPage }) => {
  await page.goto(BASE_URL);

  // Locator benar, tapi password sengaja salah
  await healPage.fill('#username', 'tomsmith');
  await healPage.fill('#password', 'gsihvagrantwashere');
  await healPage.click('button[type="submit"]');

  // Verifikasi error flash message muncul
  const flash = page.locator('#flash');
  await expect(flash).toBeVisible();
  await expect(flash).toContainText('Your password is invalid!');
  console.log('\n  [TC-04] ✅ Passed — error message terverifikasi dengan benar');
});
