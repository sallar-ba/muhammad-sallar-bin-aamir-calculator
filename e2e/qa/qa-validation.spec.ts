// Validation: the S-6.1 message table, timing rules from the README, and inputs the docs do not list.
// Rule from the brief: never a crash, never a wrong result, always a clear message.
import type { Locator, Page } from '@playwright/test'
import {
  amountBox,
  describedMessage,
  ex,
  expect,
  feeBox,
  figure,
  fillOffer,
  lengthBox,
  offerCard,
  offerMessages,
  parseMoney,
  PLACEHOLDER,
  RESULTS_WHEN_VALID,
  BOX_NAMES,
  choose,
  named,
  rateBox,
  resultsOf,
  test,
  themes,
  addButton,
} from './qa-helpers.ts'

const M = {
  amountRequired: 'Enter the amount borrowed.',
  rateRequired: 'Enter the interest rate.',
  lengthRequired: 'Enter the loan length.',
  nan: 'Enter a number using only digits, a decimal point and commas.',
  decimals: 'Use no more than 2 decimal places.',
  amount: 'Enter an amount between $1,000 and $100,000,000.',
  rate: 'Enter a rate between 0% and 50%.',
  months: 'Enter a whole number of months between 1 and 120.',
  years: 'Enter a whole number of years between 1 and 10.',
  feePercent: 'Enter a fee between 0% and 10%.',
  feeFixed: 'Enter a fee of $0 or more, less than the amount borrowed.',
  commas: 'Use a point for decimals (4.5) and commas only between thousands (250,000).',
}

type BoxName = 'amount' | 'rate' | 'length' | 'fee'
const boxes: Record<BoxName, (page: Page, n: number) => Locator> = { amount: amountBox, rate: rateBox, length: lengthBox, fee: feeBox }

const nameOf: Record<string, BoxName> = { 'Amount borrowed': 'amount', 'Annual interest rate (%)': 'rate', 'Loan length': 'length', 'Upfront fee': 'fee' }

/**
 * Expects the box to be red, its message under the offer as one line "Box name: message", tied to the box
 * (aria-describedby names only the message), no figures, and the right note where the figures would be.
 */
async function expectRejected(page: Page, box: Locator, message: string) {
  const name = nameOf[(await box.getAttribute('aria-label'))!]
  await expect(offerMessages(page, 1).filter({ hasText: `${BOX_NAMES[name]}:` })).toHaveText(named(name, message))
  await expect(box).toHaveAttribute('aria-invalid', 'true')
  expect(await describedMessage(box)).toBe(message)
  const [inputColour, danger] = await box.evaluate((el) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--danger)'
    document.body.append(probe)
    const colours = [getComputedStyle(el).color, getComputedStyle(probe).color]
    probe.remove()
    return colours
  })
  expect(inputColour, 'the box turns red').toBe(danger)
  await expect(resultsOf(page, 1)).toHaveCount(0)
  const required = await Promise.all([amountBox, rateBox, lengthBox].map((b) => b(page, 1).inputValue()))
  const note = required.some((value) => value.trim() === '') ? PLACEHOLDER : RESULTS_WHEN_VALID
  await expect(offerCard(page, 1).getByText(note, { exact: true })).toBeVisible()
}

async function expectAccepted(page: Page) {
  await expect(offerMessages(page, 1)).toHaveCount(0)
  await expect(resultsOf(page, 1)).toBeVisible()
  await expect(offerCard(page, 1).locator('[aria-invalid="true"]')).toHaveCount(0)
}

// S-6.1, every row, starting from example A.
const table: [BoxName, string, string, { unit?: 'years'; feeType?: 'fixed' }?][] = [
  ['amount', '', M.amountRequired],
  ['amount', 'abc', M.nan],
  ['amount', '1e5', M.nan],
  ['amount', '1.2.3', M.nan],
  ['amount', '100000.555', M.decimals],
  ['amount', '1000,50', M.commas],
  ['amount', '1,,000', M.commas],
  ['amount', '999.99', M.amount],
  ['amount', '100,000,000.01', M.amount],
  ['amount', '-5000', M.amount],
  ['amount', '99999999999999999999', M.amount],
  ['rate', '', M.rateRequired],
  ['rate', '12%', M.nan],
  ['rate', '12.555', M.decimals],
  ['rate', '4,5', M.commas],
  ['rate', '-0.01', M.rate],
  ['rate', '50.01', M.rate],
  ['length', '', M.lengthRequired],
  ['length', '0', M.months],
  ['length', '121', M.months],
  ['length', '12.5', M.months],
  ['length', 'twelve', M.months],
  ['length', '11', M.years, { unit: 'years' }],
  ['length', '1.5', M.years, { unit: 'years' }],
  ['fee', '10.01', M.feePercent],
  ['fee', '-1', M.feePercent],
  ['fee', '2.555', M.decimals],
  ['fee', 'two', M.nan],
  ['fee', '100,000', M.feeFixed, { feeType: 'fixed' }],
  ['fee', '-1', M.feeFixed, { feeType: 'fixed' }],
]

test.describe('S-6.1 message table', () => {
  for (const [name, value, message, opts] of table) {
    const where = opts?.unit ? ' (years)' : opts?.feeType ? ' (fixed amount)' : ''
    test(`${name}${where} "${value}" -> "${message}"`, async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { ...ex.A, unit: opts?.unit, feeType: opts?.feeType })
      const box = boxes[name](page, 1)
      await box.fill(value)
      await box.blur()
      await expectRejected(page, box, message)
    })
  }
})

// Inputs the docs do not list. Expected outcomes follow the README input rules.
const extra: [BoxName, string, string | 'valid', string?][] = [
  ['amount', '.', M.nan],
  ['amount', '-', M.nan],
  ['amount', '$', M.nan],
  ['amount', ',', M.nan],
  ['amount', '0.', M.amount],
  ['amount', '00012', M.amount],
  ['amount', '0x3e8', M.nan],
  ['amount', 'Infinity', M.nan],
  ['amount', 'NaN', M.nan],
  ['amount', '+5000', M.nan],
  ['amount', '$$1000', M.nan],
  ['amount', '100 000', M.nan],
  ['amount', '100 000', M.nan],
  ['amount', '１００，０００', M.nan], // full-width digits and comma
  ['amount', '٢٥٠٠٠٠', M.nan], // Arabic-Indic digits
  ['amount', '9'.repeat(300), M.amount],
  ['amount', '1' + '0'.repeat(5) + '.' + '0'.repeat(40), M.decimals],
  ['amount', '001,000', 'valid', '$1,000.00'],
  ['amount', ',1000,', M.commas],
  ['amount', '1,0,0,0', M.commas],
  ['amount', '250,000,', M.commas],
  ['amount', ',5', M.commas],
  ['amount', '1000,5', M.commas],
  ['amount', '1,000.5,0', M.commas],
  ['amount', '-$5000', M.amount],
  ['rate', '12,5', M.commas],
  ['fee', '1,5', M.commas],
  ['length', '1,2', M.months],
  ['amount', '\t100000\t', 'valid', '$100,000.00'],
  ['rate', '$12', M.nan],
  ['rate', '12 %', M.nan],
  ['rate', '.', M.nan],
  ['rate', '-', M.nan],
  ['rate', '0.', 'valid'],
  ['rate', '00012', 'valid'],
  ['length', '$12', M.months],
  ['length', '-12', M.months],
  ['length', '1e1', M.months],
  ['length', '12.0', 'valid'],
  ['fee', '$2', M.nan],
  ['fee', '2%', M.nan],
  ['fee', '.', M.nan],
]

test.describe('inputs the docs do not list', () => {
  for (const [name, value, outcome, shown] of extra) {
    const label = value.length > 30 ? `${value.slice(0, 12)}… (${value.length} chars)` : JSON.stringify(value)
    test(`${name} ${label} -> ${outcome === 'valid' ? 'accepted' : `"${outcome}"`}`, async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, ex.A)
      const box = boxes[name](page, 1)
      await box.fill(value)
      await box.blur()
      if (outcome === 'valid') {
        await expectAccepted(page)
        if (shown) await expect(figure(page, 1, 'Amount borrowed')).toHaveText(shown)
      } else {
        await expectRejected(page, box, outcome)
      }
    })
  }

  test('a fixed fee typed with $ and commas is accepted', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, feeType: 'fixed', fee: '$5,000' })
    await expect(figure(page, 1, 'Upfront fee')).toHaveText('$5,000.00')
  })

  test('pasting a value with spaces inside gives a message, not a guess', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only here')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await fillOffer(page, 1, ex.A)
    await amountBox(page, 1).fill('')
    await page.evaluate(() => navigator.clipboard.writeText('250 000'))
    await amountBox(page, 1).focus()
    await page.keyboard.press('ControlOrMeta+V')
    await expect(amountBox(page, 1)).toHaveValue('250 000')
    await amountBox(page, 1).blur()
    await expectRejected(page, amountBox(page, 1), M.nan)
  })
})

test.describe('switching units while a value is invalid', () => {
  test('121 months -> years shows the years message; fixing it shows 10-year figures', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, length: '121' })
    await lengthBox(page, 1).blur()
    await expectRejected(page, lengthBox(page, 1), M.months)
    await choose(page, 1, 'unit', 'years')
    await expectRejected(page, lengthBox(page, 1), M.years)
    await lengthBox(page, 1).fill('10')
    await expectAccepted(page)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$1,434.71')
  })

  test('a valid 15 months becomes invalid as years: the message appears at once (switching counts as leaving)', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, length: '15' })
    await choose(page, 1, 'unit', 'years')
    await expectRejected(page, lengthBox(page, 1), M.years)
  })

  test('11 years is invalid; switching to months makes it valid and clears the message', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, length: '11', unit: 'years' })
    await lengthBox(page, 1).blur()
    await expectRejected(page, lengthBox(page, 1), M.years)
    await choose(page, 1, 'unit', 'months')
    await expectAccepted(page)
  })

  test('15 (% of amount) is invalid; switching to fixed makes it a $15 fee', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, fee: '15' })
    await feeBox(page, 1).blur()
    await expectRejected(page, feeBox(page, 1), M.feePercent)
    await choose(page, 1, 'feeType', 'fixed')
    await expectAccepted(page)
    await expect(figure(page, 1, 'Upfront fee')).toHaveText('$15.00')
  })

  test('a fixed fee of $5,000 switched to % of amount shows the number message', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, feeType: 'fixed', fee: '$5,000' })
    await choose(page, 1, 'feeType', 'percent')
    await expectRejected(page, feeBox(page, 1), M.nan)
  })

  test('a fixed fee equal to the amount switched to % shows the % range message', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, feeType: 'fixed', fee: '100,000' })
    await feeBox(page, 1).blur()
    await expectRejected(page, feeBox(page, 1), M.feeFixed)
    await choose(page, 1, 'feeType', 'percent')
    await expectRejected(page, feeBox(page, 1), M.feePercent)
  })
})

test.describe('timing of messages', () => {
  test('S-6.3: figures go at once, the message waits for leaving the box', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.A)
    await amountBox(page, 1).fill('999')
    await expect(resultsOf(page, 1)).toHaveCount(0)
    await expect(offerMessages(page, 1)).toHaveCount(0)
    await amountBox(page, 1).blur()
    await expectRejected(page, amountBox(page, 1), M.amount)
  })

  test('a showing message changes as you type and goes once valid (S-6.4)', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, amount: 'abc' })
    await amountBox(page, 1).blur()
    await expectRejected(page, amountBox(page, 1), M.nan)
    await amountBox(page, 1).fill('500')
    await expect(offerMessages(page, 1)).toHaveText([named('amount', M.amount)])
    await amountBox(page, 1).fill('100,000')
    await expectAccepted(page)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
  })

  test('S-3.7/S-3.8: lowering the amount below a fixed fee flags the fee, fixing the fee clears it', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '12', feeType: 'fixed', fee: '5,000' })
    await feeBox(page, 1).blur()
    await amountBox(page, 1).fill('4,000')
    await amountBox(page, 1).blur()
    await expectRejected(page, feeBox(page, 1), M.feeFixed)
    await feeBox(page, 1).fill('500')
    await expectAccepted(page)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$355.40')
    await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$764.74')
  })

  test('S-6.5: two messages, fixed one at a time', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.A)
    await amountBox(page, 1).fill('abc')
    await amountBox(page, 1).blur()
    await rateBox(page, 1).fill('60')
    await rateBox(page, 1).blur()
    await expect(offerMessages(page, 1)).toHaveText([named('amount', M.nan), named('rate', M.rate)])
    await amountBox(page, 1).fill('100,000')
    await expect(offerMessages(page, 1)).toHaveText([named('rate', M.rate)])
    await expect(resultsOf(page, 1)).toHaveCount(0)
    await rateBox(page, 1).fill('12')
    await expectAccepted(page)
  })

  test('S-6.6: tabbing through an empty new offer shows nothing', async ({ page }) => {
    await page.goto('/')
    await addButton(page).click()
    for (let i = 0; i < 7; i++) await page.keyboard.press('Tab')
    await expect(offerCard(page, 2).getByRole('listitem')).toHaveCount(0)
  })

  test('S-6.8 and S-3.5: clearing the fee is fine; clearing every box removes all messages', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.A)
    await feeBox(page, 1).fill('')
    await feeBox(page, 1).blur()
    await expectAccepted(page)
    await expect(figure(page, 1, 'Upfront fee')).toHaveText('$0.00')
    await amountBox(page, 1).fill('')
    await amountBox(page, 1).blur()
    await rateBox(page, 1).fill('60')
    await rateBox(page, 1).blur()
    await expect(offerMessages(page, 1)).toHaveText([named('amount', M.amountRequired), named('rate', M.rate)])
    for (const box of [rateBox, lengthBox]) await box(page, 1).fill('')
    await lengthBox(page, 1).blur()
    await expect(offerMessages(page, 1)).toHaveCount(0)
    await expect(offerCard(page, 1)).toContainText(PLACEHOLDER)
  })
})

test.describe('rapid edits', () => {
  test('typing quickly key by key ends on the right figures', async ({ page }) => {
    await page.goto('/')
    await amountBox(page, 1).pressSequentially('1000000', { delay: 0 })
    for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace')
    await page.keyboard.type('0,000', { delay: 0 }) // "100" + "0,000" = "1000,000": not a valid grouping
    await amountBox(page, 1).blur()
    await expect(offerMessages(page, 1)).toHaveText([named('amount', M.commas)])
    await amountBox(page, 1).focus()
    await page.keyboard.press('End')
    for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace') // "1000": valid, so the message goes
    await expect(offerMessages(page, 1)).toHaveCount(0)
    await page.keyboard.type('0000,000', { delay: 0 }) // "10000000,000": invalid again, but no message until leaving
    await expect(offerMessages(page, 1)).toHaveCount(0)
    await amountBox(page, 1).blur()
    await expect(offerMessages(page, 1)).toHaveText([named('amount', M.commas)])
    await amountBox(page, 1).fill('')
    await amountBox(page, 1).pressSequentially('10,000,000', { delay: 0 })
    await rateBox(page, 1).pressSequentially('12', { delay: 0 })
    await lengthBox(page, 1).pressSequentially('12', { delay: 0 })
    await feeBox(page, 1).pressSequentially('2', { delay: 0 })
    await expect(figure(page, 1, 'Amount borrowed')).toHaveText('$10,000,000.00')
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$888,487.89')
  })

  test('random input never crashes and results are never shown next to a red box', async ({ page }) => {
    const pieces = ['1', '0', '9', '5', ',', '.', '-', '$', ' ', 'e', '%', 'a', '１', '٣', ' ', '00', '999', '120', '50']
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const word = () => Array.from({ length: Math.floor(random() * 6) }, () => pieces[Math.floor(random() * pieces.length)]).join('')
    await page.goto('/')
    for (let i = 0; i < 60; i++) {
      const name = (['amount', 'rate', 'length', 'fee'] as const)[i % 4]
      await boxes[name](page, 1).fill(word())
      if (random() < 0.2) await choose(page, 1, 'unit', random() < 0.5 ? 'years' : 'months')
      if (random() < 0.2) await choose(page, 1, 'feeType', random() < 0.5 ? 'fixed' : 'percent')
      if (random() < 0.5) await boxes[name](page, 1).blur()
      const red = await offerCard(page, 1).locator('[aria-invalid="true"]').count()
      const shown = await resultsOf(page, 1).count()
      expect(red && shown, `step ${i}: results next to a red box`).toBeFalsy()
      if (shown) {
        const amount = parseMoney((await figure(page, 1, 'Amount borrowed').textContent())!)
        const repaid = parseMoney((await figure(page, 1, 'Total repaid').textContent())!)
        const interest = parseMoney((await figure(page, 1, 'Total interest').textContent())!)
        expect(repaid - amount, `step ${i}: totals add up`).toBe(interest)
        expect(amount).toBeGreaterThanOrEqual(1_000_00)
      }
    }
  })
})

for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })
    test('error state is visible and readable (screenshot)', async ({ page }, info) => {
      await page.goto('/')
      await fillOffer(page, 1, { amount: 'abc', rate: '60', length: '0', fee: '11' })
      await page.keyboard.press('Tab')
      await expect(offerMessages(page, 1)).toHaveCount(4)
      await offerCard(page, 1).screenshot({ path: `test-results/qa/errors-${info.project.name}-${colorScheme}.png` })
    })
  })
}

// Regression check for the new comma rule (QA-5): legitimate grouped numbers must still be accepted.
test.describe('grouped numbers that must still be accepted', () => {
  const amounts: [string, string][] = [
    ['1,000', '$1,000.00'],
    ['10,000', '$10,000.00'],
    ['100,000', '$100,000.00'],
    ['1,000,000', '$1,000,000.00'],
    ['100,000,000', '$100,000,000.00'],
    ['12,345,678.90', '$12,345,678.90'],
    ['1,234.56', '$1,234.56'],
    ['1,000.', '$1,000.00'],
    [' 1,000 ', '$1,000.00'],
    ['$1,000', '$1,000.00'],
    ['1,00,000', '$100,000.00'],
    ['10,00,000', '$1,000,000.00'],
    ['1,00,00,000', '$10,000,000.00'],
    ['12,34,567', '$1,234,567.00'],
    ['2,50,000.50', '$250,000.50'],
    ['$ 2,50,000', '$250,000.00'],
  ]
  test('amounts in Western and Indian grouping', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.A)
    for (const [typed, shown] of amounts) {
      await amountBox(page, 1).fill(typed)
      await amountBox(page, 1).blur()
      await expect.soft(figure(page, 1, 'Amount borrowed'), `"${typed}"`).toHaveText(shown)
      await expect.soft(offerMessages(page, 1), `"${typed}": no message`).toHaveCount(0)
    }
  })
  test('fixed fees with grouping commas', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { ...ex.A, amount: '10,00,000', feeType: 'fixed' })
    for (const [typed, shown] of [['$2,500', '$2,500.00'], ['2,500.75', '$2,500.75'], ['1,00,000', '$100,000.00'], ['999,999.99', '$999,999.99']]) {
      await feeBox(page, 1).fill(typed)
      await feeBox(page, 1).blur()
      await expect.soft(figure(page, 1, 'Upfront fee'), `"${typed}"`).toHaveText(shown)
    }
  })
})
