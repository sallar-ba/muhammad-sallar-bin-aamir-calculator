// Regression checks for the Radix dropdowns that replaced the native <select>s (months/years, % of amount/fixed amount):
// keyboard, focus return, Escape, outside click, touch, 44px targets, phone layout, both themes and axe.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { amountBox, ex, expect, figure, fillOffer, lengthBox, offerMessages, rateBox, test, themes, unitChoice, addButton, offerCards } from './qa-helpers.ts'

// While a listbox is open Radix hides the rest of the page from assistive technology, so role queries cannot
// see the trigger then; this CSS locator can.
const trigger = (page: Page, n: number, label: 'Loan length unit' | 'Upfront fee type') =>
  page.locator(`section[aria-labelledby="offer-${n}-title"] button[aria-label="${label}"]`)
const listbox = (page: Page) => page.getByRole('listbox')
/** Radix ignores keys and outside clicks in the first ~16-50 ms after the list opens (measured); people are slower. */
const humanPause = (page: Page) => page.waitForTimeout(150)

test('keyboard: Enter opens, arrows and Enter choose, focus returns to the trigger, figures update', async ({ page }) => {
  await page.goto('/')
  await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '5' })
  await trigger(page, 1, 'Loan length unit').focus()
  await expect(trigger(page, 1, 'Loan length unit')).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Enter')
  await expect(listbox(page)).toBeVisible()
  await expect(trigger(page, 1, 'Loan length unit')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('option', { name: 'months' })).toBeFocused()
  await humanPause(page)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(listbox(page)).toHaveCount(0)
  await expect(trigger(page, 1, 'Loan length unit')).toBeFocused()
  await expect(trigger(page, 1, 'Loan length unit')).toHaveText('years')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$2,224.44')
})

test('keyboard: Space opens, Escape closes without changing the value and focus returns', async ({ page }) => {
  await page.goto('/')
  await fillOffer(page, 1, ex.A)
  await trigger(page, 1, 'Upfront fee type').focus()
  await page.keyboard.press(' ')
  await expect(listbox(page)).toBeVisible()
  await humanPause(page)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(listbox(page)).toHaveCount(0)
  await expect(trigger(page, 1, 'Upfront fee type')).toBeFocused()
  await expect(trigger(page, 1, 'Upfront fee type')).toHaveText('% of amount')
  await expect(figure(page, 1, 'Upfront fee')).toHaveText('$2,000.00')
})

test('Tab from the loan length box reaches the unit dropdown (Chromium; Safari needs Option+Tab)', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari Tabs only to text boxes by default (see QA report)')
  await page.goto('/')
  await lengthBox(page, 1).focus()
  await page.keyboard.press('Tab')
  await expect(unitChoice(page, 1)).toBeFocused()
})

test('choosing a unit counts as leaving the length box (README rule)', async ({ page }) => {
  await page.goto('/')
  await amountBox(page, 1).fill('100,000')
  await rateBox(page, 1).fill('12')
  await trigger(page, 1, 'Loan length unit').click()
  await page.getByRole('option', { name: 'years' }).click()
  await expect(offerMessages(page, 1)).toHaveText(['Loan length: Enter the loan length.'])
})

test('clicking outside closes the list without changing the value', async ({ page }) => {
  await page.goto('/')
  await trigger(page, 1, 'Loan length unit').click()
  await expect(listbox(page)).toBeVisible()
  await humanPause(page)
  await page.mouse.click(5, 5)
  await expect(listbox(page)).toHaveCount(0)
  await expect(trigger(page, 1, 'Loan length unit')).toHaveText('months')
  await addButton(page).click() // the page is usable again (Radix blocks pointer events while open)
  await expect(offerCards(page)).toHaveCount(2)
})

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch checks run in the phone projects')
  for (const width of [412, 320]) {
    test(`${width}px: tap opens without choosing, options are 44px and on screen, tap chooses, page stays usable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 })
      await page.goto('/')
      await fillOffer(page, 1, ex.A)
      const fee = trigger(page, 1, 'Upfront fee type')
      await fee.scrollIntoViewIfNeeded()
      await fee.tap()
      await expect(listbox(page)).toBeVisible()
      await expect(fee).toHaveText('% of amount')
      const options = await page.getByRole('option').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return { text: el.textContent, top: r.top, left: r.left, right: r.right, bottom: r.bottom, h: r.height }
        }),
      )
      const vw = page.viewportSize()!.width
      const vh = page.viewportSize()!.height
      for (const o of options) {
        expect.soft(o.h, `${o.text} height`).toBeGreaterThanOrEqual(44)
        expect.soft(o.left >= 0 && o.right <= vw && o.top >= 0 && o.bottom <= vh, `${o.text} is on screen`).toBe(true)
      }
      await page.getByRole('option', { name: 'fixed amount' }).tap()
      await expect(listbox(page)).toHaveCount(0)
      await expect(fee).toHaveText('fixed amount')
      await expect(figure(page, 1, 'Upfront fee')).toHaveText('$2.00')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
      await addButton(page).tap()
      await expect(offerCards(page)).toHaveCount(2)
    })
  }
})

for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    test('axe finds no WCAG 2.2 AA violations with a list open; focus is held in the list', async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, ex.A)
      await trigger(page, 1, 'Upfront fee type').click()
      await expect(listbox(page)).toBeVisible()
      await page.waitForTimeout(300)
      // While open, Radix hides the rest of the page (aria-hidden) but leaves its controls focusable, which axe
      // reports as aria-hidden-focus. That only matters if focus can get there, so check the trap instead.
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['aria-hidden-focus'])
        .analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
      for (const key of ['Tab', 'Shift+Tab', 'Tab']) {
        await page.keyboard.press(key)
        await expect(listbox(page), `${key} keeps the list open`).toBeVisible()
        expect(await page.evaluate(() => document.activeElement?.closest('[role="listbox"]') !== null), `${key} keeps focus in the list`).toBe(true)
      }
    })

    test('the open list is readable: option text 4.5:1, list edge or shadow visible', async ({ page }, info) => {
      await page.goto('/')
      await trigger(page, 1, 'Loan length unit').click()
      await expect(listbox(page)).toBeVisible()
      await page.waitForTimeout(300)
      const ratios = await page.getByRole('option').evaluateAll((els) =>
        els.map((el) => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!
          const flat = (layers: string[]) => {
            ctx.clearRect(0, 0, 1, 1)
            for (const c of layers) {
              ctx.fillStyle = c
              ctx.fillRect(0, 0, 1, 1)
            }
            return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
          }
          const lum = ([r, g, b]: number[]) =>
            [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
          const layers: string[] = []
          for (let n: Element | null = el; n; n = n.parentElement) {
            const bg = getComputedStyle(n).backgroundColor
            layers.unshift(bg)
            if (/^rgb\(/.test(bg)) break
          }
          layers.unshift('#fff')
          const [a, b] = [lum(flat([...layers, getComputedStyle(el).color])), lum(flat(layers))].sort((x, y) => y - x)
          return { text: el.textContent, ratio: Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100 }
        }),
      )
      for (const r of ratios) expect.soft(r.ratio, `${r.text} ${r.ratio}:1`).toBeGreaterThanOrEqual(4.5)
      await page.screenshot({ path: `test-results/qa/dropdown-open-${info.project.name}-${colorScheme}.png` })
    })
  })
}

test('reload clears a chosen unit back to months and % of amount (nothing is stored)', async ({ page }) => {
  await page.goto('/')
  await fillOffer(page, 1, { ...ex.A, unit: 'years', feeType: 'fixed' })
  await page.reload()
  await expect(unitChoice(page, 1)).toHaveText('months')
  await expect(trigger(page, 1, 'Upfront fee type')).toHaveText('% of amount')
})
