'use strict';

require('dotenv/config');
const Groq = require('groq-sdk');
const fs   = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
const CACHE_FILE           = './healing-cache.json';
const REPORT_FILE          = './healing-report.log';
const CACHE_TTL_MS         = 60 * 60 * 1000; // 1 jam
const CONFIDENCE_THRESHOLD = 0.75;

const groq = new Groq.default({ apiKey: process.env.GROQ_API_KEY });

// ── Cache helpers ─────────────────────────────────────────────────────────────
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function appendReport(line) {
  fs.appendFileSync(REPORT_FILE, line + '\n');
}

// ── DOM snapshot ──────────────────────────────────────────────────────────────
/**
 * Ekstrak elemen interaktif dari DOM secara ringkas.
 * Dikirim ke LLM sebagai konteks untuk menemukan locator alternatif.
 */
async function extractDomSnapshot(page) {
  if (page.isClosed()) {
    throw new Error('[self-heal] Page sudah ditutup — tidak bisa ekstrak DOM snapshot');
  }

  return page.evaluate(() => {
    const selectors = [
      'button', 'a', 'input', 'select',
      'textarea', '[role]', '[data-testid]', 'label',
    ];
    const nodes = document.querySelectorAll(selectors.join(','));

    return Array.from(nodes)
      .slice(0, 150)
      .map((el) => {
        const attrs = [];
        ['id', 'class', 'name', 'type', 'role', 'aria-label',
         'data-testid', 'placeholder', 'for'].forEach((a) => {
          const v = el.getAttribute(a);
          if (v) attrs.push(`${a}="${v.slice(0, 60)}"`);
        });
        const text = (el.textContent ?? '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 80);
        return `<${el.tagName.toLowerCase()} ${attrs.join(' ')}>${text}</${el.tagName.toLowerCase()}>`;
      })
      .join('\n');
  });
}

// ── Groq LLM call ─────────────────────────────────────────────────────────────
async function askGroqForLocator(originalLocator, domSnapshot, errorMessage) {
  const prompt = `You are a Playwright automation expert. A UI locator has broken and needs recovery.

BROKEN LOCATOR: ${originalLocator}
ERROR: ${errorMessage}

CURRENT DOM SNAPSHOT (interactive elements only):
${domSnapshot}

Instructions:
1. Identify which element the broken locator was originally targeting.
2. Find the best matching element in the DOM snapshot above.
3. Return ONE valid Playwright locator string using this priority:
   1. page.getByRole('...', { name: '...' })
   2. page.getByTestId('...')
   3. page.getByLabel('...')
   4. page.getByText('...')
   5. page.locator('[data-testid="..."]')
   6. page.locator('css-selector') — last resort only

Return ONLY valid JSON (no markdown, no explanation):
{
  "locator": "page.getByRole('button', { name: 'Login' })",
  "confidence": 0.92,
  "strategy": "role"
}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  const raw    = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  return {
    locator:    parsed.locator    ?? '',
    confidence: parsed.confidence ?? 0,
    strategy:   parsed.strategy   ?? 'unknown',
  };
}

// ── Public: healLocator ───────────────────────────────────────────────────────
/**
 * Entry point utama self-healer.
 * Dipanggil oleh fixtures.js ketika sebuah action Playwright gagal.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} originalLocator  - selector yang gagal
 * @param {Error}  error            - error asli dari Playwright
 * @returns {{ success: boolean, newLocator: string|null, confidence: number, strategy: string }}
 */
async function healLocator(page, originalLocator, error) {
  const cache  = loadCache();
  const cached = cache[originalLocator];

  // 1. Cache hit — tidak perlu panggil Groq
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`\n  [self-heal] ✅ Cache hit: "${originalLocator}" → "${cached.newLocator}"`);
    return {
      success:    true,
      newLocator: cached.newLocator,
      confidence: cached.confidence,
      strategy:   'cache',
    };
  }

  console.log(`\n  [self-heal] 🔍 Locator gagal: "${originalLocator}". Memanggil Groq...`);

  // 2. Ekstrak DOM snapshot
  const domSnapshot = await extractDomSnapshot(page);

  // 3. Tanya LLM
  const suggestion = await askGroqForLocator(originalLocator, domSnapshot, error.message);

  // 4. Confidence gate — jangan silent pass kalau LLM tidak yakin
  if (!suggestion.locator || suggestion.confidence < CONFIDENCE_THRESHOLD) {
    const msg = `  [self-heal] ⚠️  Confidence rendah (${suggestion.confidence}). Auto-heal dilewati.`;
    console.warn(msg);
    appendReport(
      `[${new Date().toISOString()}] REJECTED: "${originalLocator}" — confidence ${suggestion.confidence}`,
    );
    return { success: false, newLocator: null, confidence: suggestion.confidence, strategy: suggestion.strategy };
  }

  // 5. Simpan ke cache + tulis log
  cache[originalLocator] = {
    newLocator:  suggestion.locator,
    confidence:  suggestion.confidence,
    timestamp:   Date.now(),
  };
  saveCache(cache);

  const logLine = [
    `[${new Date().toISOString()}]`,
    `HEALED: "${originalLocator}"`,
    `→ "${suggestion.locator}"`,
    `(confidence: ${suggestion.confidence}, strategy: ${suggestion.strategy})`,
  ].join(' ');
  appendReport(logLine);
  console.log(`  [self-heal] ✅ Healed → ${suggestion.locator} (confidence: ${suggestion.confidence})`);

  return {
    success:    true,
    newLocator: suggestion.locator,
    confidence: suggestion.confidence,
    strategy:   suggestion.strategy,
  };
}

module.exports = { healLocator };
