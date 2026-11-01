import { expect, test, type Page } from '@playwright/test'
import { A, B1, B2, B3, addButton, box, choose, enter, enterOffers, figure, offer, offers, results, resultsPanel, scrollsSideways } from './helpers.ts'

// One test per MVP acceptance criterion in docs/user-stories.md, named by its ID and asserting what the
// criterion says the user sees. docs/acceptance-report.md is generated from these results.

const PROMPT = 'Enter the amount borrowed, interest rate and loan length to see results.'
const ADD_ANOTHER = 'Add another offer to compare.'
const COMPLETE_ANOTHER = 'Complete another offer to compare.'
const DIFFERENT_AMOUNTS =
  "These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them."
const DISCLAIMER = "Estimates only. Your lender's figures may differ slightly because of rounding."

const AMOUNT = 'Amount borrowed'
const RATE = 'Annual interest rate (%)'
const LENGTH = 'Loan length'
const FEE = 'Upfront fee'
const EMI = 'Monthly payment (EMI)'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

async function expectFigures(page: Page, n: number, expected: Record<string, string>) {
  for (const [label, value] of Object.entries(expected)) await expect(figure(page, n, label)).toHaveText(value)
}

async function expectNoFigures(page: Page) {
  await expect(page.getByRole('region', { name: /results$/ })).toHaveCount(0)
  await expect(resultsPanel(page)).not.toContainText('$')
}

/** Types into a box, then leaves it. */
async function replace(page: Page, n: number, label: string, value: string) {
  await box(page, n, label).fill(value)
  await box(page, n, label).press('Tab')
}

/** True when the box is drawn with the theme's danger colour. */
function isRed(page: Page, n: number, label: string) {
  return box(page, n, label).evaluate((input) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--danger)'
    document.body.append(probe)
    const danger = getComputedStyle(probe).color
    probe.remove()
    return getComputedStyle(input.closest('label')!).boxShadow.includes(danger)
  })
}

/** Where focus goes on each Tab press, described as "Offer n: control" or the control's name. */
async function tabOrder(page: Page, presses: number, key = 'Tab') {
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  const order: string[] = []
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press(key)
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const where = el.closest('section[aria-labelledby]')?.querySelector('h2')?.textContent
        return `${where ? `${where}: ` : ''}${el.getAttribute('aria-label') ?? el.textContent?.trim()}`
      }),
    )
  }
  return order
}

const FIELDS = [AMOUNT, RATE, LENGTH, 'Loan length unit', FEE, 'Upfront fee type']

// ---------------------------------------------------------------------------------------------- S-1

test('S-1.1', async ({ page }) => {
  await enter(page, 1, A)
  await expect(figure(page, 1, EMI)).toHaveText('$8,884.88')
})

test('S-1.2', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '12' })
  await box(page, 1, LENGTH).fill('1')
  await choose(page, 1, 'Loan length unit', 'years')
  await expect(figure(page, 1, EMI)).toHaveText('$8,884.88')
})

test('S-1.3', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '12', length: '5' })
  await choose(page, 1, 'Loan length unit', 'years')
  await expect(box(page, 1, LENGTH)).toHaveValue('5')
  await expect(figure(page, 1, EMI)).toHaveText('$2,224.44')
})

test('S-1.4', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '0', length: '3' })
  await expect(figure(page, 1, EMI)).toHaveText('$333.33')
})

test('S-1.5', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '12', length: '1' })
  await expect(figure(page, 1, EMI)).toHaveText('$1,010.00')
})

test('S-1.6', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await enter(page, 1, { amount: '100,000,000', rate: '50', length: '120' })
  const emi = figure(page, 1, EMI)
  await expect(emi).toHaveText('$4,197,969.76')
  const right = await emi.evaluate((el) => el.getBoundingClientRect().right)
  expect(right).toBeLessThanOrEqual(375)
  expect(await scrollsSideways(page)).toBe(false)
})

test('S-1.7', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '0.01', length: '12' })
  await expect(figure(page, 1, EMI)).toHaveText('$8,333.78')
})

test('S-1.8', async ({ page }) => {
  await enter(page, 1, { rate: '12', length: '12' })
  for (const amount of ['1,00,000', ' 100000 ', '$100,000']) {
    await box(page, 1, AMOUNT).fill(amount)
    await expect(figure(page, 1, EMI), `amount typed as "${amount}"`).toHaveText('$8,884.88')
  }
})

test('S-1.9', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '12' })
  await expectNoFigures(page)
  await expect(offer(page, 1)).toContainText(PROMPT)
})

test.describe('with the browser in German', () => {
  test.use({ locale: 'de-DE' })
  test('S-1.10', async ({ page }) => {
    expect(await page.evaluate(() => navigator.language)).toBe('de-DE')
    await enter(page, 1, A)
    await expect(figure(page, 1, EMI)).toHaveText('$8,884.88')
  })
})

test('S-1.11', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await enter(page, 1, A)
  expect(await scrollsSideways(page)).toBe(false)
  const outside = await page.evaluate(() =>
    [...document.querySelectorAll('main input, main select, main dd')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.left < 0 || r.right > window.innerWidth
      })
      .map((el) => el.getAttribute('aria-label') ?? el.textContent),
  )
  expect(outside).toEqual([])
})

test('S-1.12', async ({ page, browserName }) => {
  await enterOffers(page, B1, B2)
  // Safari moves Tab through text boxes only unless the user turns on full keyboard access;
  // Option+Tab (Alt+Tab) reaches every control, so that is what a Safari keyboard user presses.
  expect(await tabOrder(page, 16, browserName === 'webkit' ? 'Alt+Tab' : 'Tab')).toEqual([
    'Dark theme',
    ...FIELDS.map((field) => `Offer 1: ${field}`),
    'Offer 1: Remove offer 1',
    ...FIELDS.map((field) => `Offer 2: ${field}`),
    'Offer 2: Remove offer 2',
    'Add another offer',
  ])
})

test('S-1.13', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await enter(page, 1, { amount: '250,000', rate: '12.5', length: '36', fixedFee: true, fee: '12,500.50' })
  await expect(figure(page, 1, FEE)).toHaveText('$12,500.50')
  expect(await scrollsSideways(page)).toBe(false)
})

test('S-1.14', async ({ page }) => {
  await enter(page, 1, A)
  await expect(resultsPanel(page).locator('[aria-live="polite"]')).toHaveText(
    'Offer 1: monthly payment $8,884.88, total cost of borrowing $8,618.53. Add another offer to compare.',
  )
})

// ---------------------------------------------------------------------------------------------- S-2

test('S-2.1', async ({ page }) => {
  await enter(page, 1, A)
  await expectFigures(page, 1, { 'Final payment': '$8,884.85', 'Total repaid': '$106,618.53', 'Total interest': '$6,618.53' })
})

test('S-2.2', async ({ page }) => {
  const cents = (text: string | null) => Math.round(Number(text!.replace(/[$,]/g, '')) * 100)
  const cases: [string, typeof A, number][] = [
    ['A', A, 12],
    ['B1', B1, 36],
    ['B3', B3, 60],
    ['$1,000 at 0% for 120 months', { amount: '1,000', rate: '0', length: '120' }, 120],
    ['$1,000 at 12% for 1 month', { amount: '1,000', rate: '12', length: '1' }, 1],
    ['the largest values', { amount: '100,000,000', rate: '50', length: '120', fee: '10' }, 120],
  ]
  for (const [name, entry, months] of cases) {
    await page.goto('/')
    await enter(page, 1, entry)
    await expect(figure(page, 1, EMI)).toBeVisible()
    const emi = cents(await figure(page, 1, EMI).textContent())
    const finalLine = figure(page, 1, 'Final payment')
    const final = (await finalLine.count()) ? cents(await finalLine.textContent()) : emi
    const repaid = cents(await figure(page, 1, 'Total repaid').textContent())
    const borrowed = cents(await figure(page, 1, AMOUNT).textContent())
    const interest = cents(await figure(page, 1, 'Total interest').textContent())
    expect(emi * (months - 1) + final, `${name}: EMI × (months − 1) + final = total repaid`).toBe(repaid)
    expect(repaid - borrowed, `${name}: total repaid − borrowed = total interest`).toBe(interest)
  }
})

test('S-2.3', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '0', length: '3' })
  await expectFigures(page, 1, { 'Final payment': '$333.34', 'Total repaid': '$1,000.00', 'Total interest': '$0.00' })
})

test('S-2.4', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '0', length: '120' })
  await expectFigures(page, 1, {
    [EMI]: '$8.33',
    'Final payment': '$8.73',
    'Total repaid': '$1,000.00',
    'Total interest': '$0.00',
  })
})

test('S-2.5', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '12', length: '1' })
  await expect(figure(page, 1, EMI)).toHaveText('$1,010.00')
  await expect(figure(page, 1, 'Final payment')).toHaveCount(0)
  await expectFigures(page, 1, { 'Total repaid': '$1,010.00', 'Total interest': '$10.00' })
})

test('S-2.6', async ({ page }) => {
  await enter(page, 1, { amount: '100,000,000', rate: '50', length: '120' })
  await expectFigures(page, 1, {
    'Final payment': '$4,197,974.28',
    'Total repaid': '$503,756,375.72',
    'Total interest': '$403,756,375.72',
  })
})

test('S-2.7', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '0.01', length: '12' })
  await expect(figure(page, 1, 'Total interest')).toHaveText('$5.43')
})

test('S-2.8', async ({ page }) => {
  await expect(page.getByText(DISCLAIMER, { exact: true })).toBeVisible()
})

test('S-2.9', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '0.99', length: '1' })
  await expect(figure(page, 1, EMI)).toHaveText('$1,000.83')
  await expect(figure(page, 1, 'Final payment')).toHaveCount(0)
  await expectFigures(page, 1, { 'Total repaid': '$1,000.83', 'Total interest': '$0.83' })
})

// ---------------------------------------------------------------------------------------------- S-3

test('S-3.1', async ({ page }) => {
  await enter(page, 1, A)
  await expectFigures(page, 1, {
    [AMOUNT]: '$100,000.00',
    [FEE]: '$2,000.00',
    'Amount received': '$98,000.00',
    'Total cost of borrowing': '$8,618.53',
  })
})

test('S-3.2', async ({ page }) => {
  await enter(page, 1, A)
  await box(page, 1, FEE).fill('10')
  await expectFigures(page, 1, {
    [EMI]: '$8,884.88',
    'Total repaid': '$106,618.53',
    'Total interest': '$6,618.53',
    [FEE]: '$10,000.00',
    'Amount received': '$90,000.00',
    'Total cost of borrowing': '$16,618.53',
  })
})

test('S-3.3', async ({ page }) => {
  await enter(page, 1, A)
  await choose(page, 1, 'Upfront fee type', 'fixed amount')
  await box(page, 1, FEE).fill('5,000')
  await expectFigures(page, 1, {
    [FEE]: '$5,000.00',
    'Amount received': '$95,000.00',
    'Total cost of borrowing': '$11,618.53',
    [EMI]: '$8,884.88',
  })
})

test('S-3.4', async ({ page }) => {
  await enter(page, 1, A)
  await choose(page, 1, 'Upfront fee type', 'fixed amount')
  await expect(box(page, 1, FEE)).toHaveValue('2')
  await expectFigures(page, 1, { [FEE]: '$2.00', 'Amount received': '$99,998.00', 'Total cost of borrowing': '$6,620.53' })
})

test('S-3.5', async ({ page }) => {
  await enter(page, 1, A)
  await replace(page, 1, FEE, '')
  await expect(offer(page, 1).getByRole('listitem')).toHaveCount(0)
  await expectFigures(page, 1, { [FEE]: '$0.00', 'Amount received': '$100,000.00', 'Total cost of borrowing': '$6,618.53' })
})

test('S-3.6', async ({ page }) => {
  await enter(page, 1, A)
  await choose(page, 1, 'Upfront fee type', 'fixed amount')
  await box(page, 1, FEE).fill('99,999.99')
  await expectFigures(page, 1, { 'Amount received': '$0.01', 'Total cost of borrowing': '$106,618.52' })
})

async function fixedFeeAboveAmount(page: Page) {
  await enter(page, 1, { amount: '100,000', rate: '12', length: '12', fixedFee: true, fee: '5,000' })
  await box(page, 1, FEE).press('Tab')
  await replace(page, 1, AMOUNT, '4,000')
}

test('S-3.7', async ({ page }) => {
  await fixedFeeAboveAmount(page)
  await expect(offer(page, 1).getByText('Enter a fee of $0 or more, less than the amount borrowed.')).toBeVisible()
  expect(await isRed(page, 1, FEE)).toBe(true)
  await expectNoFigures(page)
})

test('S-3.8', async ({ page }) => {
  await fixedFeeAboveAmount(page)
  await box(page, 1, FEE).fill('500')
  await expect(offer(page, 1).getByText('Enter a fee of $0 or more, less than the amount borrowed.')).toHaveCount(0)
  await expectFigures(page, 1, {
    [EMI]: '$355.40',
    [FEE]: '$500.00',
    'Amount received': '$3,500.00',
    'Total cost of borrowing': '$764.74',
  })
})

test('S-3.9', async ({ page }) => {
  await enter(page, 1, A)
  const panel = results(page, 1)
  await expect(panel.getByRole('heading', { name: 'What you repay' })).toBeVisible()
  await expect(panel).toContainText(
    'You repay $106,618.53 in total: the $98,000.00 you receive, plus $8,618.53 cost of borrowing (the upfront fee and the interest).',
  )
  const colour = (title: string) =>
    panel.getByRole('img').locator(`[title^="${title}:"]`).evaluate((el) => getComputedStyle(el).backgroundColor)
  const key = (label: string) =>
    panel.locator(`dt:text-is("${label}")`).evaluate((el) => getComputedStyle(el, '::before').backgroundColor)
  for (const label of [FEE, 'Total interest', 'Amount received']) {
    expect(await key(label), `${label} key matches its bar segment`).toBe(await colour(label))
  }
  await expectFigures(page, 1, { [FEE]: '$2,000.00', 'Total interest': '$6,618.53', 'Amount received': '$98,000.00' })
})

// ---------------------------------------------------------------------------------------------- S-4

test('S-4.1', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 1).locator('mark')).toHaveText('$53,582.58')
  await expect(results(page, 2)).toContainText('Costs $2,846.15 more in total')
  await expect(results(page, 3)).toContainText('Costs $30,084.20 more in total')
  await expect(results(page, 3)).toContainText('Lowest monthly payment')
  await expect(resultsPanel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
})

test('S-4.2', async ({ page }) => {
  await enterOffers(page, { amount: '100,000', rate: '0', length: '12', fee: '5' }, { amount: '100,000', rate: '8', length: '12' })
  await expect(results(page, 2)).toContainText('Lowest total cost')
  await expect(figure(page, 2, 'Total cost of borrowing')).toHaveText('$4,386.11')
  await expect(results(page, 1)).toContainText('Costs $613.89 more in total')
  await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$5,000.00')
})

test('S-4.3', async ({ page }) => {
  await enterOffers(page, B1, B1, B3)
  for (const n of [1, 2]) {
    await expect(results(page, n)).toContainText('Lowest total cost (tied)')
    await expect(results(page, n)).not.toContainText('more in total')
  }
  await expect(results(page, 3)).toContainText('Costs $30,084.20 more in total')
  await expect(resultsPanel(page)).toContainText('Offers 1 and 2 tie for the lowest total cost: $53,582.58.')
})

test('S-4.4', async ({ page }) => {
  await enterOffers(page, B1, B1, B1)
  for (const n of [1, 2, 3]) {
    await expect(results(page, n)).toContainText('Lowest total cost (tied)')
    await expect(results(page, n)).toContainText('Lowest monthly payment (tied)')
    await expect(results(page, n)).not.toContainText('more in total')
  }
})

test('S-4.5', async ({ page }) => {
  await enterOffers(page, B1)
  await expect(offers(page)).toHaveCount(1)
  await expect(figure(page, 1, EMI)).toHaveText('$8,363.41')
  await expect(results(page, 1)).not.toContainText('Lowest')
  await expect(resultsPanel(page)).toContainText(ADD_ANOTHER)
})

test('S-4.6', async ({ page }) => {
  await enterOffers(page, B1, B2)
  await replace(page, 2, RATE, '60')
  await expect(offer(page, 2).getByText('Enter a rate between 0% and 50%.')).toBeVisible()
  await expect(results(page, 2)).toHaveCount(0)
  await expect(figure(page, 1, EMI)).toHaveText('$8,363.41')
  await expect(results(page, 1)).not.toContainText('Lowest')
  await expect(resultsPanel(page)).toContainText(COMPLETE_ANOTHER)
})

test('S-4.7', async ({ page }) => {
  await expect(offers(page)).toHaveCount(1)
  await expect(offer(page, 1)).toContainText(PROMPT)
  await expectNoFigures(page)
  await expect(resultsPanel(page)).not.toContainText('Lowest')
  await expect(resultsPanel(page)).not.toContainText(ADD_ANOTHER)
  await expect(resultsPanel(page)).not.toContainText('different amounts')
})

test('S-4.8', async ({ page }) => {
  await enterOffers(page, B1, { ...B2, amount: '200,000' })
  for (const n of [1, 2]) {
    await expect(figure(page, n, EMI)).toBeVisible()
    await expect(results(page, n)).not.toContainText('Lowest')
    await expect(results(page, n)).not.toContainText('more in total')
  }
  await expect(resultsPanel(page)).toContainText(DIFFERENT_AMOUNTS)
})

test('S-4.9', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  const order = (n: number) => results(page, n).getByRole('img').locator('div').evaluateAll((els) => els.map((el) => el.getAttribute('title')?.split(':')[0]))
  expect(await order(1)).toEqual([FEE, 'Total interest', 'Amount received'])
  expect(await order(3)).toEqual(['Total interest', 'Amount received'])
  const width = async (n: number) => (await results(page, n).getByRole('img').boundingBox())!.width
  // Total repaid: B1 $301,082.58, B2 $298,928.73, B3 $333,666.78.
  await expect.poll(async () => (await width(1)) / (await width(3))).toBeCloseTo(301_082.58 / 333_666.78, 2)
  await expect.poll(async () => (await width(2)) / (await width(3))).toBeCloseTo(298_928.73 / 333_666.78, 2)
})

test('S-4.10', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await enterOffers(
    page,
    { amount: '100,000,000', rate: '50', length: '120', fee: '10' },
    { amount: '100,000,000', rate: '49.99', length: '120', fee: '9.99' },
    { amount: '100,000,000', rate: '1', length: '1' },
  )
  await expect(results(page, 3)).toBeVisible()
  const problems = await resultsPanel(page).evaluate((panel) => {
    const edge = panel.getBoundingClientRect()
    // Measure the rendered text, not the element: text can spill out of its grid cell over a neighbour.
    const textBox = (el: Element) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      return range.getBoundingClientRect()
    }
    const boxes = [...panel.querySelectorAll('dd, dt, h3')].map((el) => ({ text: el.textContent, r: textBox(el) }))
    const found: string[] = []
    for (const { text, r } of boxes) if (r.left < edge.left - 0.5 || r.right > edge.right + 0.5) found.push(`cut off: ${text}`)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i].r, boxes[j].r]
        const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
        if (overlap) found.push(`overlap: ${boxes[i].text} / ${boxes[j].text}`)
      }
    }
    return found
  })
  expect(problems).toEqual([])
})

// ---------------------------------------------------------------------------------------------- S-5

test('S-5.1', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await expect(results(page, 3)).toContainText('Lowest monthly payment')
  await expect(figure(page, 3, EMI)).toHaveText('$5,561.11')
  await expect(results(page, 3)).toContainText('Costs $30,084.20 more in total')
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(resultsPanel(page)).toContainText('Offer 3 has the lowest monthly payment: $5,561.11.')
})

test('S-5.2', async ({ page }) => {
  await enterOffers(page, { amount: '100,000', rate: '11', length: '12', fee: '2' }, A)
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 1)).toContainText('Lowest monthly payment')
  await expect(figure(page, 1, EMI)).toHaveText('$8,838.17')
  await expect(results(page, 2)).toContainText('Costs $560.55 more in total')
})

test('S-5.3', async ({ page }) => {
  await enterOffers(page, A, { ...A, fixedFee: true, fee: '5,000' })
  for (const n of [1, 2]) await expect(results(page, n)).toContainText('Lowest monthly payment (tied)')
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 2)).toContainText('Costs $3,000.00 more in total')
})

// ---------------------------------------------------------------------------------------------- S-6

const NOT_A_NUMBER = 'Enter a number using only digits, a decimal point and commas.'
const DECIMALS = 'Use no more than 2 decimal places.'
const AMOUNT_RANGE = 'Enter an amount between $1,000 and $100,000,000.'
const RATE_RANGE = 'Enter a rate between 0% and 50%.'
const MONTHS = 'Enter a whole number of months between 1 and 120.'
const YEARS = 'Enter a whole number of years between 1 and 10.'
const FEE_PERCENT = 'Enter a fee between 0% and 10%.'
const FEE_FIXED = 'Enter a fee of $0 or more, less than the amount borrowed.'
const COMMAS = 'Use a point for decimals (4.5) and commas only between thousands (250,000).'
const NAMES: Record<string, string> = { [AMOUNT]: 'Amount borrowed', [RATE]: 'Interest rate', [LENGTH]: 'Loan length', [FEE]: 'Upfront fee' }

type Row = [label: string, value: string, message: string, setup?: { years?: boolean; fixedFee?: boolean }]
const TABLE: Row[] = [
  [AMOUNT, '', 'Enter the amount borrowed.'],
  [AMOUNT, 'abc', NOT_A_NUMBER],
  [AMOUNT, '1e5', NOT_A_NUMBER],
  [AMOUNT, '1.2.3', NOT_A_NUMBER],
  [AMOUNT, '100000.555', DECIMALS],
  [AMOUNT, '1000,50', COMMAS],
  [AMOUNT, '1,,000', COMMAS],
  [AMOUNT, '999.99', AMOUNT_RANGE],
  [AMOUNT, '100,000,000.01', AMOUNT_RANGE],
  [AMOUNT, '-5000', AMOUNT_RANGE],
  [AMOUNT, '99999999999999999999', AMOUNT_RANGE],
  [RATE, '', 'Enter the interest rate.'],
  [RATE, '12%', NOT_A_NUMBER],
  [RATE, '12.555', DECIMALS],
  [RATE, '4,5', COMMAS],
  [RATE, '-0.01', RATE_RANGE],
  [RATE, '50.01', RATE_RANGE],
  [LENGTH, '', 'Enter the loan length.'],
  [LENGTH, '0', MONTHS],
  [LENGTH, '121', MONTHS],
  [LENGTH, '12.5', MONTHS],
  [LENGTH, 'twelve', MONTHS],
  [LENGTH, '11', YEARS, { years: true }],
  [LENGTH, '1.5', YEARS, { years: true }],
  [FEE, '10.01', FEE_PERCENT],
  [FEE, '-1', FEE_PERCENT],
  [FEE, '2.555', DECIMALS],
  [FEE, 'two', NOT_A_NUMBER],
  [FEE, '100,000', FEE_FIXED, { fixedFee: true }],
  [FEE, '-1', FEE_FIXED, { fixedFee: true }],
]

test('S-6.1', async ({ page }) => {
  for (const [label, value, message, setup] of TABLE) {
    const row = `${label} "${value}"`
    await page.goto('/')
    await enter(page, 1, { ...A, ...setup })
    await replace(page, 1, label, value)
    await expect.soft(offer(page, 1).getByText(message, { exact: true }), `${row}: message`).toBeVisible()
    await expect
      .soft(offer(page, 1).getByRole('listitem').filter({ hasText: message }), `${row}: message names its box`)
      .toContainText(`${NAMES[label]}:`)
    expect.soft(await isRed(page, 1, label), `${row}: box turns red`).toBe(true)
    await expect.soft(results(page, 1), `${row}: no figures`).toHaveCount(0)
  }
})

test('S-6.2', async ({ page }) => {
  const boundaries: [string, string, { years?: boolean; fixedFee?: boolean }?][] = [
    [AMOUNT, '1,000'],
    [AMOUNT, '100,000,000'],
    [RATE, '0'],
    [RATE, '50'],
    [LENGTH, '1'],
    [LENGTH, '120'],
    [LENGTH, '1', { years: true }],
    [LENGTH, '10', { years: true }],
    [FEE, '0'],
    [FEE, '10'],
    [FEE, '0', { fixedFee: true }],
  ]
  for (const [label, value, setup] of boundaries) {
    await page.goto('/')
    await enter(page, 1, { ...A, ...setup })
    await replace(page, 1, label, value)
    await expect.soft(offer(page, 1).getByRole('listitem'), `${label} ${value}: no message`).toHaveCount(0)
    await expect.soft(figure(page, 1, EMI), `${label} ${value}: figures shown`).toBeVisible()
  }
})

test('S-6.3', async ({ page }) => {
  await enter(page, 1, A)
  await expect(figure(page, 1, EMI)).toBeVisible()
  await box(page, 1, AMOUNT).fill('999')
  await expect(results(page, 1)).toHaveCount(0)
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toHaveCount(0)
  await box(page, 1, AMOUNT).press('Tab')
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toBeVisible()
})

test('S-6.4', async ({ page }) => {
  await enter(page, 1, A)
  await replace(page, 1, AMOUNT, '999')
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toBeVisible()
  await box(page, 1, AMOUNT).focus()
  await box(page, 1, AMOUNT).fill('100,000')
  await expect(box(page, 1, AMOUNT)).toBeFocused()
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toHaveCount(0)
  await expect(figure(page, 1, EMI)).toHaveText('$8,884.88')
})

test('S-6.5', async ({ page }) => {
  await enter(page, 1, A)
  await replace(page, 1, AMOUNT, 'abc')
  await replace(page, 1, RATE, '60')
  await expect(offer(page, 1).getByText(NOT_A_NUMBER)).toBeVisible()
  await expect(offer(page, 1).getByText(RATE_RANGE)).toBeVisible()
  await box(page, 1, AMOUNT).fill('100,000')
  await expect(offer(page, 1).getByText(NOT_A_NUMBER)).toHaveCount(0)
  await expect(offer(page, 1).getByText(RATE_RANGE)).toBeVisible()
  await expect(results(page, 1)).toHaveCount(0)
  await box(page, 1, RATE).fill('12')
  await expect(offer(page, 1).getByText(RATE_RANGE)).toHaveCount(0)
  await expect(figure(page, 1, EMI)).toHaveText('$8,884.88')
})

test('S-6.6', async ({ page }) => {
  await addButton(page).click()
  await expect(box(page, 2, AMOUNT)).toBeFocused()
  for (let i = 0; i < FIELDS.length; i++) await page.keyboard.press('Tab')
  await expect(offer(page, 2).getByRole('listitem')).toHaveCount(0)
  await expect(offer(page, 2).locator('[aria-invalid="true"]')).toHaveCount(0)
})

test('S-6.7', async ({ page }) => {
  await box(page, 1, AMOUNT).fill('100,000')
  await box(page, 1, AMOUNT).press('Tab')
  await box(page, 1, RATE).press('Tab')
  await expect(offer(page, 1).getByText('Enter the interest rate.')).toBeVisible()
  await expect(offer(page, 1).getByText('Enter the loan length.')).toHaveCount(0)
})

test('S-6.8', async ({ page }) => {
  await enter(page, 1, { amount: 'abc', rate: '60', length: '0', fee: 'x' })
  await box(page, 1, FEE).press('Tab')
  await expect(offer(page, 1).getByRole('listitem')).not.toHaveCount(0)
  for (const label of [AMOUNT, RATE, LENGTH, FEE]) await box(page, 1, label).fill('')
  await expect(offer(page, 1).getByRole('listitem')).toHaveCount(0)
  await expect(offer(page, 1)).toContainText(PROMPT)
})

test('S-6.9', async ({ page }) => {
  await enterOffers(page, B1, B2)
  await replace(page, 2, RATE, '60')
  await expectFigures(page, 1, { [EMI]: '$8,363.41', 'Total cost of borrowing': '$53,582.58', 'Total repaid': '$301,082.58' })
})

test('S-6.10', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('dialog', (dialog) => {
    problems.push(`dialog: ${dialog.message()}`)
    void dialog.dismiss()
  })
  await enterOffers(page, B1, B2)
  for (const [label, value, , setup] of TABLE) {
    await choose(page, 2, 'Loan length unit', setup?.years ? 'years' : 'months')
    await choose(page, 2, 'Upfront fee type', setup?.fixedFee ? 'fixed amount' : '% of amount')
    await replace(page, 2, label, value)
    await expect.soft(figure(page, 1, EMI), `${label} "${value}" in Offer 2: Offer 1 still calculates`).toHaveText('$8,363.41')
    await enter(page, 2, { ...B2, length: '36', fee: '3' })
  }
  await expect(page.locator('#root')).not.toBeEmpty()
  expect(problems).toEqual([])
})

test('S-6.11', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', length: '12', rate: '60' })
  await expect(results(page, 1)).toHaveCount(0)
  await expect(offer(page, 1)).toContainText('Results appear once every box has a valid value.')
  await expect(offer(page, 1)).not.toContainText(PROMPT)
})

test('S-6.12', async ({ page }) => {
  await enter(page, 1, A)
  await replace(page, 1, RATE, '60')
  const outline = () =>
    box(page, 1, RATE).evaluate((input) => {
      const style = getComputedStyle(input.closest('label')!)
      return `${style.outlineStyle} ${style.outlineWidth}`
    })
  expect(await outline()).toMatch(/^none/)
  await page.keyboard.press('Shift+Tab')
  await expect(box(page, 1, RATE)).toBeFocused()
  expect(await outline()).toBe('solid 2px')
  expect(await isRed(page, 1, RATE)).toBe(true)
})

test('S-6.13', async ({ page }) => {
  await enter(page, 1, A)
  await replace(page, 1, AMOUNT, '1'.repeat(60))
  await expect(offer(page, 1).getByText(AMOUNT_RANGE, { exact: true })).toBeVisible()
  expect(await scrollsSideways(page)).toBe(false)
  // On a wide screen the page cannot scroll sideways; there the risk is the offer growing over the results.
  const card = (await offer(page, 1).boundingBox())!
  const panel = (await resultsPanel(page).boundingBox())!
  const overlaps = card.x < panel.x + panel.width && panel.x < card.x + card.width && card.y < panel.y + panel.height && panel.y < card.y + card.height
  expect(overlaps, 'offer card overlaps the Results panel').toBe(false)
})

test('S-6.14', async ({ page }) => {
  await enter(page, 1, A)
  await replace(page, 1, RATE, '60')
  await expect(offer(page, 1).locator('ul[aria-live="polite"]')).toContainText(RATE_RANGE)
})

// ---------------------------------------------------------------------------------------------- S-7

test('S-7.1', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await box(page, 2, RATE).fill('11')
  await expect(figure(page, 2, EMI)).toHaveText('$8,184.68')
  await expect(figure(page, 2, 'Total cost of borrowing')).toHaveText('$52,148.42')
  await expect(results(page, 2)).toContainText('Lowest total cost')
  await expect(results(page, 1)).toContainText('Costs $1,434.16 more in total')
  await expect(results(page, 3)).toContainText('Costs $31,518.36 more in total')
  await expect(results(page, 3)).toContainText('Lowest monthly payment')
  await expect(resultsPanel(page)).toContainText('Offer 2 has the lowest total cost: $52,148.42.')
})

test('S-7.2', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await box(page, 1, RATE).fill('60')
  await expect(results(page, 1)).toHaveCount(0)
  await expect(results(page, 2)).toContainText('Lowest total cost')
  await expect(results(page, 3)).toContainText('Lowest monthly payment')
  await expect(results(page, 3)).toContainText('Costs $27,238.05 more in total')
  await box(page, 1, RATE).fill('12.5')
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 2)).toContainText('Costs $2,846.15 more in total')
  await expect(results(page, 3)).toContainText('Costs $30,084.20 more in total')
})

test('S-7.3', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await box(page, 3, AMOUNT).fill('200,000')
  await expect(resultsPanel(page)).toContainText(DIFFERENT_AMOUNTS)
  await expect(resultsPanel(page)).not.toContainText('Lowest')
  await expect(resultsPanel(page)).not.toContainText('more in total')
  await box(page, 3, AMOUNT).fill('250,000')
  await expect(resultsPanel(page)).not.toContainText(DIFFERENT_AMOUNTS)
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 3)).toContainText('Costs $30,084.20 more in total')
})

test('S-7.4', async ({ page }) => {
  await enterOffers(page, B1, B2)
  for (const label of [AMOUNT, RATE, LENGTH, FEE]) await box(page, 2, label).fill('')
  await expect(resultsPanel(page)).not.toContainText('Lowest')
  await expect(resultsPanel(page)).toContainText(COMPLETE_ANOTHER)
})

test('S-7.5', async ({ page }) => {
  await enterOffers(page, B1)
  await expect(resultsPanel(page)).toContainText(ADD_ANOTHER)
  await addButton(page).click()
  await enter(page, 2, B2)
  await expect(resultsPanel(page)).not.toContainText(ADD_ANOTHER)
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 2)).toContainText('Lowest monthly payment')
  await expect(results(page, 2)).toContainText('Costs $2,846.15 more in total')
})

// ---------------------------------------------------------------------------------------------- S-8

test('S-8.1', async ({ page }) => {
  const sent: string[] = []
  page.on('request', (request) => sent.push([request.url(), request.postData() ?? '', JSON.stringify(request.headers())].join(' ')))
  await enter(page, 1, { amount: '123,456.78', rate: '12', length: '12' })
  await expect(figure(page, 1, AMOUNT)).toHaveText('$123,456.78')
  await box(page, 1, RATE).fill('11')
  await box(page, 1, LENGTH).fill('24')
  await expect(figure(page, 1, EMI)).toBeVisible()
  for (const typed of ['123456.78', '123,456.78', '123%2C456.78']) {
    expect(sent.filter((line) => line.includes(typed))).toEqual([])
  }
})

test('S-8.2', async ({ page, context }) => {
  await context.setOffline(true)
  await enter(page, 1, A)
  await expect(figure(page, 1, EMI)).toHaveText('$8,884.88')
  await context.setOffline(false)
})

test('S-8.3', async ({ page }) => {
  await enterOffers(page, B1, B2)
  await page.reload()
  await expect(offers(page)).toHaveCount(1)
  for (const label of [AMOUNT, RATE, LENGTH, FEE]) await expect(box(page, 1, label)).toHaveValue('')
  await expectNoFigures(page)
})

test('S-8.4', async ({ page }) => {
  await enterOffers(page, B1, B2)
  await expect(page.locator('input[type="email"], input[type="tel"], input[type="password"]')).toHaveCount(0)
  await expect(page.getByText(/sign in|log in|e-?mail|phone|your name/i)).toHaveCount(0)
})

// --------------------------------------------------------------------------------------------- S-12

test('S-12.1', async ({ page }) => {
  await expect(offers(page)).toHaveCount(1)
  await expect(offer(page, 1).getByRole('heading', { name: 'Offer 1' })).toBeVisible()
  await expect(offer(page, 1).getByRole('button', { name: /Remove/ })).toHaveCount(0)
  const offerBottom = (await offer(page, 1).boundingBox())!
  const add = (await addButton(page).boundingBox())!
  expect(add.y).toBeGreaterThan(offerBottom.y + offerBottom.height - 1)
})

test('S-12.2', async ({ page }) => {
  await enter(page, 1, { amount: '250,000' })
  await addButton(page).click()
  await expect(box(page, 2, AMOUNT)).toHaveValue('250,000')
  for (const label of [RATE, LENGTH, FEE]) await expect(box(page, 2, label)).toHaveValue('')
  await expect(box(page, 2, RATE)).toBeFocused()

  await page.goto('/')
  await enter(page, 1, { amount: 'abc' })
  await addButton(page).click()
  await expect(box(page, 2, AMOUNT)).toHaveValue('')
  await expect(box(page, 2, AMOUNT)).toBeFocused()
})

test('S-12.3', async ({ page }) => {
  await addButton(page).click()
  await addButton(page).click()
  await expect(offers(page)).toHaveCount(3)
  await expect(addButton(page)).toHaveCount(0)
})

test('S-12.4', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await offer(page, 2).getByRole('button', { name: 'Remove offer 2' }).click()
  await expect(offers(page)).toHaveCount(2)
  await expect(box(page, 2, LENGTH)).toHaveValue('60')
  await expect(results(page, 2)).toContainText('Costs $30,084.20 more in total')
  await expect(addButton(page)).toBeFocused()
})

test('S-12.5', async ({ page }) => {
  await expect(offer(page, 1).getByRole('button', { name: /Remove/ })).toHaveCount(0)
  await addButton(page).click()
  await offer(page, 2).getByRole('button', { name: 'Remove offer 2' }).click()
  await expect(offers(page)).toHaveCount(1)
  await expect(offer(page, 1).getByRole('button', { name: /Remove/ })).toHaveCount(0)
})
