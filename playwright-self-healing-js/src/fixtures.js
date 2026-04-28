'use strict';

const { test: base, expect } = require('@playwright/test');
const { healLocator }        = require('./self-healer');

// Timeout pendek sebelum trigger healer.
// Jangan biarkan Playwright nunggu 30-90s sebelum throw.
const FAST_TIMEOUT = 3_000;

// ── Resolve locator string → Playwright Locator object ────────────────────────
/**
 * LLM mengembalikan string seperti:
 *   "page.getByRole('textbox', { name: 'Username' })"
 * Fungsi ini meng-eval string tersebut ke Locator yang aktual.
 */
function resolveLocator(page, locatorExpression) {
  // eslint-disable-next-line no-new-func
  return new Function('page', `return ${locatorExpression}`)(page);
}

// ── withHeal: wrapper utama ───────────────────────────────────────────────────
/**
 * Coba jalankan action dengan selector asli.
 * Kalau gagal dalam FAST_TIMEOUT → panggil healer → retry dengan locator baru.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}   originalSelector
 * @param {Function} action  - (locator) => Promise<void>
 */
async function withHeal(page, originalSelector, action) {
  try {
    await page
      .locator(originalSelector)
      .waitFor({ state: 'attached', timeout: FAST_TIMEOUT });

    await action(page.locator(originalSelector));
  } catch (err) {
    const result = await healLocator(page, originalSelector, err);

    if (!result.success || !result.newLocator) {
      throw err; // healer gagal → test fail secara eksplisit
    }

    const healedLocator = resolveLocator(page, result.newLocator);
    await action(healedLocator);
  }
}

// ── Extended fixture ──────────────────────────────────────────────────────────
const test = base.extend({
  /**
   * healPage: kumpulan action Playwright yang dibungkus self-healing.
   *
   * Penggunaan di test:
   *   await healPage.fill('#broken-selector', 'value');
   *   await healPage.click('#broken-btn');
   */
  healPage: async ({ page }, use) => {
    await use({
      /** Klik sebuah elemen */
      click: (selector) =>
        withHeal(page, selector, (loc) => loc.click()),

      /** Isi input field */
      fill: (selector, value) =>
        withHeal(page, selector, (loc) => loc.fill(value)),

      /** Pilih option di dropdown */
      selectOption: (selector, value) =>
        withHeal(page, selector, async (loc) => { await loc.selectOption(value); }),

      /** Centang checkbox */
      check: (selector) =>
        withHeal(page, selector, (loc) => loc.check()),

      /** Cek apakah elemen terlihat (tidak throw, return boolean) */
      isVisible: async (selector) => {
        try {
          return await page.locator(selector).isVisible();
        } catch {
          return false;
        }
      },

      /** Ambil teks dari elemen */
      getText: async (selector) => {
        try {
          return await page.locator(selector).innerText();
        } catch (err) {
          const result = await healLocator(page, selector, err);
          if (!result.success || !result.newLocator) throw err;
          return resolveLocator(page, result.newLocator).innerText();
        }
      },
    });
  },
});

module.exports = { test, expect };
