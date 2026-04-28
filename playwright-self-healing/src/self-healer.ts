import Groq from 'groq-sdk';
import { Page } from '@playwright/test';
import * as fs from 'fs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealResult {
  success: boolean;
  newLocator: string | null;
  confidence: number;
  strategy: string;
}

interface CacheEntry {
  newLocator: string;
  confidence: number;
  timestamp: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CACHE_FILE   = './healing-cache.json';
const REPORT_FILE  = './healing-report.log';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CONFIDENCE_THRESHOLD = 0.75;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Cache helpers ────────────────────────────────────────────────────────────

function loadCache(): Record<string, CacheEntry> {
  try {
    if (fs.existsSync(CACHE_FILE)) return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {}
  return {};
}

function saveCache(cache: Record<string, CacheEntry>): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function appendReport(line: string): void {
  fs.appendFileSync(REPORT_FILE, line + '\n');
}

// ─── DOM snapshot ─────────────────────────────────────────────────────────────

/**
 * Extracts a lightweight snapshot of interactive elements from the live DOM.
 * Strips everything irrelevant to avoid blowing the LLM context window.
 */
async function extractDomSnapshot(page: Page): Promise<string> {
  if (page.isClosed()) {
    throw new Error('[self-heal] Page is already closed — cannot extract DOM snapshot');
  }

  return page.evaluate((): string => {
    const selectors = ['button', 'a', 'input', 'select', 'textarea', '[role]', '[data-testid]', 'label'];
    const nodes = document.querySelectorAll(selectors.join(','));
    return Array.from(nodes)
      .slice(0, 150)
      .map((el: Element) => {                                          // ← tambah ": Element"
        const attrs: string[] = [];
        ['id', 'class', 'name', 'type', 'role', 'aria-label', 'data-testid', 'placeholder', 'for'].forEach((a: string) => {
          const v = el.getAttribute(a);
          if (v) attrs.push(`${a}="${v.slice(0, 60)}"`);
        });
        const text = ((el.textContent ?? '').trim().replace(/\s+/g, ' ')).slice(0, 80);
        return `<${el.tagName.toLowerCase()} ${attrs.join(' ')}>${text}</${el.tagName.toLowerCase()}>`;
      })
      .join('\n');
  });
}

// ─── LLM call ─────────────────────────────────────────────────────────────────

async function askGroqForLocator(
  originalLocator: string,
  domSnapshot: string,
  errorMessage: string,
): Promise<{ locator: string; confidence: number; strategy: string }> {
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
   6. page.locator('css') — last resort only

Return ONLY valid JSON (no markdown, no extra text):
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

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  return {
    locator:    parsed.locator   ?? '',
    confidence: parsed.confidence ?? 0,
    strategy:   parsed.strategy  ?? 'unknown',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main self-healing entry point.
 * Called when a Playwright action throws — attempts LLM locator recovery.
 *
 * @returns HealResult — check .success and .newLocator before acting
 */
export async function healLocator(
  page: Page,
  originalLocator: string,
  error: Error,
): Promise<HealResult> {
  const cache = loadCache();
  const cached = cache[originalLocator];

  // 1. Return cached result if still fresh
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`\n  [self-heal] ✅ Cache hit: "${originalLocator}" → "${cached.newLocator}"`);
    return { success: true, newLocator: cached.newLocator, confidence: cached.confidence, strategy: 'cache' };
  }

  console.log(`\n  [self-heal] 🔍 Locator failed: "${originalLocator}". Calling Groq (llama-3.1-8b-instant)...`);

  // 2. Extract DOM snapshot
  const domSnapshot = await extractDomSnapshot(page);

  // 3. Ask LLM
  const suggestion = await askGroqForLocator(originalLocator, domSnapshot, error.message);

  // 4. Confidence gate — never silently swallow low-confidence heals
  if (!suggestion.locator || suggestion.confidence < CONFIDENCE_THRESHOLD) {
    const msg = `  [self-heal] ⚠️  Low confidence (${suggestion.confidence}). Skipping auto-heal.`;
    console.warn(msg);
    appendReport(`[${new Date().toISOString()}] REJECTED: "${originalLocator}" — confidence ${suggestion.confidence}`);
    return { success: false, newLocator: null, confidence: suggestion.confidence, strategy: suggestion.strategy };
  }

  // 5. Persist to cache + log
  cache[originalLocator] = { newLocator: suggestion.locator, confidence: suggestion.confidence, timestamp: Date.now() };
  saveCache(cache);

  const logLine = `[${new Date().toISOString()}] HEALED: "${originalLocator}" → "${suggestion.locator}" (confidence: ${suggestion.confidence}, strategy: ${suggestion.strategy})`;
  appendReport(logLine);
  console.log(`  [self-heal] ✅ Healed → ${suggestion.locator} (confidence: ${suggestion.confidence}, strategy: ${suggestion.strategy})`);

  return { success: true, newLocator: suggestion.locator, confidence: suggestion.confidence, strategy: suggestion.strategy };
}
