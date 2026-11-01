// Layout: no sideways scrolling, nothing sticking out of its card, and no figure wider than its slot,
// at desktop, laptop, tablet, 200% zoom and phone widths, in both themes. Screenshots go to test-results/qa/.
import type { Page } from '@playwright/test'
import { ex, expect, fillOffer, fillOffers, offerCard, sideways, test, themes, type OfferValues } from './qa-helpers.ts'

const scenarios: Record<string, OfferValues[]> = {
  'B1-B2-B3': [ex.B1, ex.B2, ex.B3],
  'largest-values-x3': [ex.MAX, { ...ex.MAX, rate: '49.99', fee: '9.99' }, { ...ex.MAX, rate: '1', length: '1', fee: '0' }],
  'largest-values-single': [ex.MAX],
  'fixed-fee-12500.50': [{ amount: '250,000', rate: '12.5', length: '36', feeType: 'fixed', fee: '12,500.50' }],
  'fixed-fee-x2': [
    { amount: '5,000,000', rate: '9.75', length: '120', feeType: 'fixed', fee: '250,000.00' },
    { amount: '5,000,000', rate: '9.5', length: '10', unit: 'years', feeType: 'fixed', fee: '275,000.00' },
  ],
  'very-long-input': [{ amount: '1234567890'.repeat(6), rate: '12', length: '12' }],
}

// [width, height, what it stands for]
const desktopWidths: [number, number, string][] = [
  [1440, 900, 'desktop'],
  [1280, 800, 'laptop'],
  [1120, 800, "just past the results panel's two-column switch"],
  [1024, 768, 'small laptop / tablet landscape'],
  [768, 1024, 'tablet portrait'],
  [720, 450, '1440 at 200% zoom'],
  [640, 400, '1280 at 200% zoom'],
]
const phoneWidths: [number, number, string][] = [
  [412, 915, 'Pixel 7'],
  [375, 812, 'iPhone SE/mini'],
  [360, 780, 'small Android'],
  [320, 640, 'WCAG reflow width (1280 at 400%)'],
]

/**
 * Problems a person would see: figures colliding with other text in the same row, text cut off at the
 * results panel's edge, offer content sticking out of its card, and anything past the viewport.
 * (A figure may spill into the gap next to it; that alone is not counted.)
 */
function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = []
    const vw = document.documentElement.clientWidth
    const textRect = (el: Element) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      return range.getBoundingClientRect()
    }
    const collide = (a: DOMRect, b: DOMRect) => {
      const across = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      return across > 1 && down > 0.5 * Math.min(a.height, b.height)
    }
    for (const section of document.querySelectorAll('section[aria-label$=" results"]')) {
      const texts = [...section.querySelectorAll('dt, dd')].map((el) => ({ el, r: textRect(el) })).filter((t) => t.r.width)
      for (const [i, a] of texts.entries())
        for (const b of texts.slice(i + 1))
          if (collide(a.r, b.r)) problems.push(`"${a.el.textContent}" overlaps "${b.el.textContent}"`)
    }
    const panel = document.querySelector('section[aria-label="Results"]')
    if (panel) {
      const edge = panel.getBoundingClientRect().right
      for (const el of panel.querySelectorAll('dd, dt, h3, p:not(.sr-only)')) {
        const t = textRect(el)
        if (t.width && t.right > edge + 0.5) problems.push(`"${el.textContent?.slice(0, 40)}" is cut off at the results panel's edge`)
      }
    }
    for (const card of document.querySelectorAll<HTMLElement>('section[aria-labelledby]')) {
      const name = card.querySelector('h2')?.textContent
      if (card.scrollWidth > card.clientWidth + 1) problems.push(`${name}: content is ${card.scrollWidth - card.clientWidth}px wider than the card`)
      const c = card.getBoundingClientRect()
      const p = panel?.getBoundingClientRect()
      if (p && Math.min(c.right, p.right) - Math.max(c.left, p.left) > 1 && Math.min(c.bottom, p.bottom) - Math.max(c.top, p.top) > 1)
        problems.push(`${name} card overlaps the results panel`)
    }
    for (const el of document.querySelectorAll('main *')) {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > vw + 1 && !el.closest('.sr-only')) {
        problems.push(`<${el.tagName.toLowerCase()} ${el.getAttribute('aria-label') ?? ''}> ends at ${Math.round(r.right)}px, past the ${vw}px viewport`)
        break
      }
    }
    return problems
  })
}

async function enterScenario(page: Page, offers: OfferValues[]) {
  await fillOffers(page, ...offers)
  await page.mouse.click(2, 300) // leave the last box, as a person would
  await page.waitForTimeout(450) // entry and bar animations
}

for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    for (const [projectIsMobile, widths] of [[false, desktopWidths], [true, phoneWidths]] as const) {
      for (const [width, height, what] of widths) {
        test.describe(`${width}px (${what})`, () => {
          test.skip(({ isMobile }) => isMobile !== projectIsMobile, 'each width runs in the matching project')
          test.use({ viewport: { width, height } })

          test('empty page fits', async ({ page }) => {
            await page.goto('/')
            expect(await sideways(page), 'sideways scroll in px').toBe(0)
            expect(await layoutProblems(page)).toEqual([])
          })

          for (const [name, offers] of Object.entries(scenarios)) {
            test(`${name}: no sideways scroll, nothing clipped or overlapping`, async ({ page }, info) => {
              await page.goto('/')
              await enterScenario(page, offers)
              await page.screenshot({ path: `test-results/qa/layout-${info.project.name}-${colorScheme}-${width}-${name}.png`, fullPage: true })
              const problems = await layoutProblems(page)
              expect.soft(await sideways(page), 'sideways scroll in px').toBe(0)
              expect.soft(problems).toEqual([])
            })
          }
        })
      }
    }
  })
}

test('S-1.6: the largest EMI is shown in full and inside a phone screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only')
  await page.goto('/')
  await fillOffer(page, 1, ex.MAX)
  const emi = page.getByRole('region', { name: 'Offer 1 results' }).locator('dd').first()
  await expect(emi).toHaveText('$4,197,969.76')
  await emi.scrollIntoViewIfNeeded()
  await expect(emi).toBeInViewport({ ratio: 1 })
})

test('a message appears under the sentence without pushing the offer sideways', async ({ page }) => {
  await page.goto('/')
  await fillOffer(page, 1, { amount: 'abc', rate: '60', length: '0', fee: '11' })
  await page.keyboard.press('Tab')
  const card = await offerCard(page, 1).evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(card).toBe(0)
})
