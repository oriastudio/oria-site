/**
 * Renders public/og.png from the live page, so the social card can never
 * drift from the real design.
 *
 * Needs the site running locally and Playwright available:
 *   npm run build && npm start          # in one shell
 *   npx playwright install chromium     # once
 *   node scripts/gen-og.mjs             # in another
 *
 * Playwright is deliberately NOT a dependency of this project — the committed
 * public/og.png is the artefact, and this script only exists to regenerate it.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const URL = process.env.OG_URL || 'http://127.0.0.1:3000/'
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'og.png')

// The card is the wordmark and headline inside the bowl — the lede is dropped
// so the arc has room, and the description meta tag carries the sentence.
const OG_CSS = `
  .waitlist, .done, .meta, .foot, .lede { display: none !important; }
  .shell { padding: 0 40px !important; }
  .hero { max-width: 640px !important; }
  h1 { font-size: 52px !important; }

  /* Force the bowl on: the card is 1200×630, which is below the height the
     page requires before it will show the ring, but the card has no form or
     lede so there is plenty of clearance here. Sized explicitly rather than
     in vh, since the capture viewport is not a real window. */
  .hero__crown { display: none !important; }
  .sky__halo {
    display: block !important;
    width: 1380px !important;
  }

  /* Freeze motion so the capture is stable. Do NOT force opacity globally, or
     the SVG dust stars lose their per-star opacity and the sky turns into a
     field of hard white specks. */
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
`

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.addStyleTag({ content: OG_CSS })
await page.waitForTimeout(600)
await page.screenshot({ path: OUT })
await browser.close()

console.log('wrote public/og.png')
