import { test as base, Page, Locator, expect } from '@playwright/test';
import { healLocator } from './self-healer';

// ─── Helper: resolve locator string → actual Playwright Locator object ────────

/**
 * LLM returns a string like: "page.getByRole('button', { name: 'Login' })"
 * This helper evaluates it against the live page object.
 */
function resolveLocator(page: Page, locatorExpression: string): Locator {
  // Strip the "page." prefix, then eval in a function scope with `page` in context
  const body = locatorExpression.replace(/^page\./, '');
  // eslint-disable-next-line no-new-func
  return new Function('page', `return page.${body}`)(page) as Locator;
}


// ─── Healing wrapper ──────────────────────────────────────────────────────────

const FAST_TIMEOUT = 3_000; // fail fast → beri waktu healer jalan

async function withHeal(
  page: Page,
  originalSelector: string,
  action: (loc: Locator) => Promise<void>,
): Promise<void> {
  try {
    // Cek keberadaan element dengan timeout pendek dulu
    await page.locator(originalSelector).waitFor({ state: 'attached', timeout: FAST_TIMEOUT });
    await action(page.locator(originalSelector));
  } catch (err) {
    const result = await healLocator(page, originalSelector, err as Error);
    if (!result.success || !result.newLocator) throw err;
    const healedLocator = resolveLocator(page, result.newLocator);
    await action(healedLocator);
  }
}

// ─── Fixture type ─────────────────────────────────────────────────────────────

type SelfHealingActions = {
  healPage: {
    click: (selector: string) => Promise<void>;
    fill: (selector: string, value: string) => Promise<void>;
    selectOption: (selector: string, value: string) => Promise<void>;
    check: (selector: string) => Promise<void>;
    isVisible: (selector: string) => Promise<boolean>;
    getText: (selector: string) => Promise<string>;
  };
};

// ─── Extended test fixture ────────────────────────────────────────────────────

export const test = base.extend<SelfHealingActions>({
  healPage: async ({ page }, use) => {
    await use({
      click: (selector) =>
        withHeal(page, selector, (loc) => loc.click()),

      fill: (selector, value) =>
        withHeal(page, selector, (loc) => loc.fill(value)),

      selectOption: (selector, value) =>
        withHeal(page, selector, async (loc) => { await loc.selectOption(value); }),

      check: (selector) =>
        withHeal(page, selector, (loc) => loc.check()),

      isVisible: async (selector) => {
        try {
          return await page.locator(selector).isVisible();
        } catch {
          return false;
        }
      },

      getText: async (selector): Promise<string> => {
        try {
          return await page.locator(selector).innerText();
        } catch (err) {
          const result = await healLocator(page, selector, err as Error);
          if (!result.success || !result.newLocator) throw err;
          return resolveLocator(page, result.newLocator).innerText();
        }
      },
    });
  },
});

export { expect };
