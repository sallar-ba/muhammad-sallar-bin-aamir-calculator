// Displayed figures against an independent reference (Python decimal, README rounding rules).
import { referenceCases } from './qa-reference.ts'
import { choose, expect, figure, fillOffer, offerCard, parseMoney, resultsOf, test, themes } from './qa-helpers.ts'

const labels = {
  emi: 'Monthly payment (EMI)',
  totalRepaid: 'Total repaid',
  totalInterest: 'Total interest',
  fee: 'Upfront fee',
  received: 'Amount received',
  totalCost: 'Total cost of borrowing',
} as const

test.describe('figures match the independent reference', () => {
  for (const c of referenceCases) {
    test(c.name, async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { ...c.input, feeType: c.input.fee ? c.input.feeType : undefined })
      for (const [key, label] of Object.entries(labels)) {
        await expect.soft(figure(page, 1, label), label).toHaveText(c.expected[key as keyof typeof labels])
      }
      // README: the final payment is shown only when it differs from the EMI.
      const final = resultsOf(page, 1).locator('dt').filter({ hasText: /^Final payment$/ })
      if (c.cents.final === c.cents.emi) await expect.soft(final, 'no Final payment line when it equals the EMI').toHaveCount(0)
      else await expect.soft(figure(page, 1, 'Final payment')).toHaveText(c.expected.final)
    })
  }
})

test('the figures on screen add up, as README promises', async ({ page }) => {
  // Several shapes of loan; the check uses only what is displayed.
  const loans = [
    { amount: '987,654.32', rate: '23.45', length: '77', fee: '4.56', months: 77 },
    { amount: '1,000', rate: '0', length: '7', fee: '', months: 7 },
    { amount: '100,000,000', rate: '50', length: '10', unit: 'years' as const, fee: '0', months: 120 },
  ]
  await page.goto('/')
  for (const loan of loans) {
    await fillOffer(page, 1, loan)
    const read = async (label: string) => parseMoney((await figure(page, 1, label).textContent())!)
    const emi = await read('Monthly payment (EMI)')
    const finalRows = await resultsOf(page, 1).locator('dt').filter({ hasText: /^Final payment$/ }).count()
    const final = finalRows ? await read('Final payment') : emi
    const repaid = await read('Total repaid')
    const borrowed = await read('Amount borrowed')
    const interest = await read('Total interest')
    const fee = await read('Upfront fee')
    expect(emi * (loan.months - 1) + final, `${loan.amount}: EMI × (n − 1) + final = total repaid`).toBe(repaid)
    expect(repaid - borrowed, 'total repaid − borrowed = total interest').toBe(interest)
    expect(interest + fee, 'interest + fee = total cost').toBe(await read('Total cost of borrowing'))
    expect(borrowed - fee, 'borrowed − fee = amount received').toBe(await read('Amount received'))
  }
})

test('switching months to years recalculates with the same number (S-1.3) and back again', async ({ page }) => {
  await page.goto('/')
  await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '5' })
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$20,603.98')
  await choose(page, 1, 'unit', 'years')
  await expect(offerCard(page, 1).getByRole('textbox', { name: 'Loan length', exact: true })).toHaveValue('5')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$2,224.44')
  await choose(page, 1, 'unit', 'months')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$20,603.98')
})

test('switching % of amount to fixed amount keeps the number and changes its meaning (S-3.4)', async ({ page }) => {
  await page.goto('/')
  await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '12', fee: '2' })
  await expect(figure(page, 1, 'Upfront fee')).toHaveText('$2,000.00')
  await choose(page, 1, 'feeType', 'fixed')
  await expect(figure(page, 1, 'Upfront fee')).toHaveText('$2.00')
  await expect(figure(page, 1, 'Amount received')).toHaveText('$99,998.00')
  await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$6,620.53')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
})

test.describe('amount formats from the README', () => {
  for (const typed of ['100000', '100,000', '1,00,000', ' 100000 ', '$100,000', '$ 100,000', '100000.00', '100,000.']) {
    test(`"${typed}" is read as $100,000`, async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { amount: typed, rate: '12', length: '12' })
      await expect(figure(page, 1, 'Amount borrowed')).toHaveText('$100,000.00')
      await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
    })
  }
})

test.describe('display does not depend on the browser language', () => {
  for (const locale of ['de-DE', 'fr-FR', 'hi-IN', 'ar-EG']) {
    test.describe(locale, () => {
      test.use({ locale })
      test(`example A shows $8,884.88 in ${locale}`, async ({ page }) => {
        await page.goto('/')
        await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '12', fee: '2' })
        await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
        await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$8,618.53')
      })
    })
  }
})

test.describe('a decimal comma is never misread as a bigger number (QA-5 fix)', () => {
  // README now: commas only between digit groups; anything else gets the comma message and no figures.
  test.use({ locale: 'de-DE' })
  const COMMAS = 'Use a point for decimals (4.5) and commas only between thousands (250,000).'
  for (const [box, typed] of [['Annual interest rate (%)', '4,5'], ['Amount borrowed', '1000,50'], ['Upfront fee', '2,5']] as const) {
    test(`${box} "${typed}" gives the comma message and no figures`, async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '12', fee: '2' })
      const input = offerCard(page, 1).getByRole('textbox', { name: box, exact: true })
      await input.fill(typed)
      await input.blur()
      await expect(offerCard(page, 1).getByRole('listitem')).toContainText([COMMAS])
      await expect(resultsOf(page, 1)).toHaveCount(0)
    })
  }
})


for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })
    test('example A shows every figure from the stories (S-1.1, S-2.1, S-3.1)', async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { amount: '100,000', rate: '12', length: '12', fee: '2' })
      const expected: [string, string][] = [
        ['Monthly payment (EMI)', '$8,884.88'],
        ['Final payment', '$8,884.85'],
        ['Total repaid', '$106,618.53'],
        ['Total interest', '$6,618.53'],
        ['Amount borrowed', '$100,000.00'],
        ['Upfront fee', '$2,000.00'],
        ['Amount received', '$98,000.00'],
        ['Total cost of borrowing', '$8,618.53'],
      ]
      for (const [label, text] of expected) await expect.soft(figure(page, 1, label), label).toHaveText(text)
    })
  })
}
