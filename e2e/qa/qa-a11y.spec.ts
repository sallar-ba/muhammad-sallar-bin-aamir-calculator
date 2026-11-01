// Accessibility: automated WCAG scans (axe), keyboard use and focus, names, error wiring,
// live region, contrast in both themes, touch targets and reduced motion.
import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import {
  addButton,
  amountBox,
  ex,
  expect,
  feeBox,
  feeChoice,
  fillOffer,
  fillOffers,
  lengthBox,
  liveRegion,
  offerCard,
  rateBox,
  removeButton,
  test,
  themeButton,
  themes,
  unitChoice,
} from './qa-helpers.ts'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const states: Record<string, (page: Page) => Promise<void>> = {
  'empty page': async () => {},
  'one offer with results': async (page) => fillOffer(page, 1, ex.A),
  'messages showing': async (page) => {
    await fillOffer(page, 1, { amount: 'abc', rate: '60', length: '0', fee: '11' })
    await page.keyboard.press('Tab')
  },
  'three offers compared': async (page) => fillOffers(page, ex.B1, ex.B2, ex.B3),
  'different amounts': async (page) => fillOffers(page, ex.B1, { ...ex.B2, amount: '200,000' }),
}

/** WCAG contrast ratio of an element's text (or ::placeholder) against what is actually behind it. */
async function textContrast(target: Locator, pseudo?: '::placeholder') {
  return target.evaluate((el, pseudo) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const flatten = (layers: string[]) => {
      ctx.clearRect(0, 0, 1, 1)
      for (const c of layers) {
        ctx.fillStyle = c
        ctx.fillRect(0, 0, 1, 1)
      }
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
    }
    const layers: string[] = []
    for (let node: Element | null = el; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor
      layers.unshift(bg)
      if (/^rgb\(/.test(bg)) break // opaque: nothing behind it shows through
    }
    layers.unshift('#fff')
    const back = flatten(layers)
    const fore = flatten([...layers, getComputedStyle(el, pseudo ?? null).color])
    const lum = ([r, g, b]: number[]) =>
      [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
    const [a, b] = [lum(fore), lum(back)].sort((x, y) => y - x)
    return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100
  }, pseudo)
}

for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    for (const [name, setup] of Object.entries(states)) {
      test(`axe finds no WCAG 2.2 AA violations: ${name}`, async ({ page }) => {
        await page.goto('/')
        await setup(page)
        await page.waitForTimeout(500) // let the entry animations finish so colours are final
        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
        const summary = results.violations.map(
          (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => `${n.target.join(' ')} -> ${n.failureSummary?.split('\n').slice(1).join(' ')}`).join('\n  ')}`,
        )
        expect(summary, 'axe violations').toEqual([])
      })
    }

    test('placeholder text in the boxes has at least 4.5:1 contrast', async ({ page }) => {
      await page.goto('/')
      const ratios: Record<string, number> = {}
      for (const box of [amountBox, rateBox, lengthBox, feeBox]) {
        const label = (await box(page, 1).getAttribute('aria-label'))!
        ratios[label] = await textContrast(box(page, 1), '::placeholder')
      }
      for (const [label, ratio] of Object.entries(ratios)) expect.soft(ratio, `${label} placeholder ${ratio}:1`).toBeGreaterThanOrEqual(4.5)
    })

    test('typed values and error text have at least 4.5:1 contrast', async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { ...ex.A, rate: '60' })
      await rateBox(page, 1).blur()
      for (const box of [amountBox, rateBox, lengthBox, feeBox]) {
        const ratio = await textContrast(box(page, 1))
        expect.soft(ratio, `${await box(page, 1).getAttribute('aria-label')} value ${ratio}:1`).toBeGreaterThanOrEqual(4.5)
      }
      const message = offerCard(page, 1).getByRole('listitem').first()
      expect.soft(await textContrast(message), 'message text').toBeGreaterThanOrEqual(4.5)
    })

    test('each box and dropdown is distinguishable from its card (non-text contrast 3:1, WCAG 1.4.11)', async ({ page }) => {
      await page.goto('/')
      for (const [name, control] of [
        ['amount box', amountBox(page, 1)],
        ['length unit dropdown', unitChoice(page, 1)],
        ['fee type dropdown', feeChoice(page, 1)],
      ] as const) {
        const ratio = await control.evaluate((el) => {
          const shape = el.tagName === 'INPUT' ? el.closest('label')! : el
          const card = el.closest('section')!
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!
          const rgb = (layers: string[]) => {
            ctx.clearRect(0, 0, 1, 1)
            for (const c of layers) {
              ctx.fillStyle = c
              ctx.fillRect(0, 0, 1, 1)
            }
            return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
          }
          const lum = ([r, g, b]: number[]) =>
            [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
          const ratioOf = (x: number[], y: number[]) => {
            const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p)
            return (a + 0.05) / (b + 0.05)
          }
          const cardBg = getComputedStyle(card).backgroundColor
          const back = rgb(['#fff', cardBg])
          const candidates = [getComputedStyle(shape).backgroundColor]
          // A visible ring (box-shadow with a spread) also outlines the box.
          for (const part of getComputedStyle(shape).boxShadow.split(/,(?![^(]*\))/)) {
            const colour = part.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|color\([^)]*\))/)?.[1]
            if (colour && !/ 0px 0px 0px 0px/.test(part)) candidates.push(colour)
          }
          return Math.max(...candidates.map((c) => ratioOf(rgb(['#fff', cardBg, c]), back)))
        })
        expect.soft(Math.round(ratio * 100) / 100, `${name}: edge or fill against the card`).toBeGreaterThanOrEqual(3)
      }
    })

    test('every control shows a visible change when focused by keyboard, including a box in error', async ({ page, browserName }) => {
      await page.goto('/')
      await fillOffers(page, { ...ex.A, rate: '60' }, ex.A)
      await rateBox(page, 1).blur()
      await expect(rateBox(page, 1)).toHaveAttribute('aria-invalid', 'true')
      await page.mouse.click(5, 300) // nothing focused
      const controls: [string, Locator, Locator][] = [
        ['theme switch', themeButton(page), themeButton(page)],
        ['amount box', amountBox(page, 1), amountBox(page, 1).locator('xpath=ancestor::label')],
        ['rate box in error', rateBox(page, 1), rateBox(page, 1).locator('xpath=ancestor::label')],
        ['length unit', unitChoice(page, 1), unitChoice(page, 1)],
        ['fee type', feeChoice(page, 1), feeChoice(page, 1)],
        ['Remove', removeButton(page, 1), removeButton(page, 1)],
        ['Add another offer', addButton(page), addButton(page)],
      ]
      // Compare the styles that draw a focus indicator (outline, ring, background, border) with and without
      // keyboard focus. Pixel diffs are not used: Tab selects a box's text, which would hide a missing indicator.
      const look = (area: Locator) =>
        area.evaluate((el) => {
          const cs = getComputedStyle(el)
          const outline = cs.outlineStyle === 'none' || cs.outlineWidth === '0px' ? 'no outline' : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`
          return [outline, cs.boxShadow, cs.backgroundColor, cs.borderColor].join(' | ')
        })
      for (const [name, control, area] of controls) {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.waitForTimeout(250) // colour transitions
        const before = (await look(area)) + (await look(control))
        // Keyboard focus: focus the previous control, then Tab, so :focus-visible applies.
        await control.evaluate((el) => {
          const all = [...document.querySelectorAll<HTMLElement>('button, input, select')]
          all[all.indexOf(el as HTMLElement) - 1]?.focus()
        })
        if (name === 'theme switch') await control.focus()
        // Safari's default Tab skips buttons (the dropdowns are buttons now); Option+Tab is its full keyboard access.
        else await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
        await expect(control).toBeFocused()
        await page.waitForTimeout(250)
        const after = (await look(area)) + (await look(control))
        expect.soft(after, `${name}: focus is visible`).not.toBe(before)
      }
    })
  })
}

test('S-1.12: Tab order is theme switch, Offer 1 controls, Remove, Offer 2 controls, Remove, Add another offer', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari only Tabs to buttons and selects with Option+Tab or a system setting')
  await page.goto('/')
  await addButton(page).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.mouse.click(5, 5) // sets the Tab starting point to the top of the page
  const names: string[] = []
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab')
    names.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const offer = el.closest('section[aria-labelledby]')?.querySelector('h2')?.textContent
        return `${offer ? offer + ': ' : ''}${el.getAttribute('aria-label') ?? el.textContent?.trim()}`
      }),
    )
  }
  const offer = (n: number) =>
    ['Amount borrowed', 'Annual interest rate (%)', 'Loan length', 'Loan length unit', 'Upfront fee', 'Upfront fee type', `Remove offer ${n}`].map(
      (c) => `Offer ${n}: ${c}`,
    )
  expect(names).toEqual(['Dark theme', ...offer(1), ...offer(2), 'Add another offer'])
})

test('keyboard only: add an offer with Enter, fill it, remove it with Enter, focus lands on Add', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari only Tabs to buttons and selects with Option+Tab or a system setting')
  await page.goto('/')
  await amountBox(page, 1).focus()
  await page.keyboard.type('250,000')
  await page.keyboard.press('Tab')
  await page.keyboard.type('12.5')
  await page.keyboard.press('Tab')
  await page.keyboard.type('36')
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab') // unit, fee, fee type, Add
  await expect(addButton(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(rateBox(page, 2)).toBeFocused()
  await page.keyboard.type('12')
  await page.keyboard.press('Tab')
  await page.keyboard.type('60')
  await expect(liveRegion(page)).toContainText('Offer 1 has the lowest total cost')
  await removeButton(page, 2).focus()
  await page.keyboard.press('Enter')
  await expect(addButton(page)).toBeFocused()
  await page.keyboard.press('Enter') // Offer 2 again
  await addButton(page).focus()
  await page.keyboard.press(' ') // Offer 3, by Space this time
  await expect(page.getByRole('region', { name: /^Offer \d$/ })).toHaveCount(3)
  // With three offers there is no Add button: removing Offer 3 by keyboard must still land somewhere sensible.
  await removeButton(page, 3).focus()
  await page.keyboard.press('Enter')
  await expect(addButton(page)).toBeFocused()
})

test('every input, choice and button has an accessible name; error messages are tied to their box', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, { ...ex.A, amount: 'x' }, ex.A)
  await amountBox(page, 1).blur()
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll('input, select, button')]
      .filter((el) => !(el.getAttribute('aria-label') || (el as HTMLInputElement).labels?.[0]?.textContent?.trim() || el.textContent?.trim()))
      .map((el) => el.outerHTML.slice(0, 80)),
  )
  expect(unnamed).toEqual([])
  const describedBy = (await amountBox(page, 1).getAttribute('aria-describedby'))!
  await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Enter a number using only digits, a decimal point and commas.')
  await expect(amountBox(page, 2)).not.toHaveAttribute('aria-invalid', /.*/)
  await expect(amountBox(page, 2)).not.toHaveAttribute('aria-describedby', /.*/)
})

test('live regions exist empty on load (so screen readers pick up later changes): one for results, one per offer for messages', async ({ page }) => {
  await page.goto('/')
  await expect(offerCard(page, 1).locator('ul[aria-live="polite"]')).toHaveCount(1)
  await expect(offerCard(page, 1).locator('ul[aria-live="polite"]')).toHaveText('')
  await expect(liveRegion(page)).toHaveCount(1)
  await expect(liveRegion(page)).toHaveAttribute('aria-live', 'polite')
  await expect(liveRegion(page)).toHaveText('')
  await fillOffer(page, 1, ex.A)
  await expect(liveRegion(page)).toHaveText(
    'Offer 1: monthly payment $8,884.88, total cost of borrowing $8,618.53. Add another offer to compare.',
  )
})

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch targets are checked in the mobile project')

  test('every tap target is at least 44 × 44 px, even with one-digit values', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, { amount: '1000', rate: '1', length: '1', fee: '1' }, { amount: '1000', rate: '1', length: '1', fee: '1' })
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('button, select, input')].map((el) => {
        const target = el.closest('label') ?? el // tapping anywhere on the label focuses its box
        const r = target.getBoundingClientRect()
        return { name: el.getAttribute('aria-label') ?? el.textContent?.trim(), w: Math.round(r.width), h: Math.round(r.height) }
      }),
    )
    for (const s of sizes) expect.soft(Math.min(s.w, s.h), `${s.name}: ${s.w}×${s.h}`).toBeGreaterThanOrEqual(44)
  })
})

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('no entry animations or bar transitions run (colour fades are not motion and are allowed)', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.B1)
    await addButton(page).click()
    await fillOffer(page, 2, ex.B2)
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty)
        .filter((name) => !/color/.test(name)),
    )
    expect(running).toEqual([])
    const durations = await page.locator('.bar-part').evaluateAll((els) => els.map((el) => getComputedStyle(el).transitionDuration))
    expect(new Set(durations)).toEqual(new Set(['0s']))
  })
})
