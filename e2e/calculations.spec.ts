import { expect, test } from '@playwright/test'
import { A, box, choose, enter, figure, resultsPanel, scrollsSideways } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('S-1.1, S-2.1, S-3.1: example A shows every figure in dollars', async ({ page }) => {
  await enter(page, 1, A)
  const expected = {
    'Monthly payment (EMI)': '$8,884.88',
    'Final payment': '$8,884.85',
    'Total cost of borrowing': '$8,618.53',
    'Amount borrowed': '$100,000.00',
    'Upfront fee': '$2,000.00',
    'Amount received': '$98,000.00',
    'Total interest': '$6,618.53',
    'Total repaid': '$106,618.53',
  }
  for (const [label, value] of Object.entries(expected)) await expect(figure(page, 1, label)).toHaveText(value)
})

test('S-1.4, S-2.3: zero interest charges exactly $0.00 and the final payment absorbs the rounding', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '0', length: '3' })
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$333.33')
  await expect(figure(page, 1, 'Final payment')).toHaveText('$333.34')
  await expect(figure(page, 1, 'Total repaid')).toHaveText('$1,000.00')
  await expect(figure(page, 1, 'Total interest')).toHaveText('$0.00')
})

test('S-1.5, S-2.5: a one-month loan has no separate final payment', async ({ page }) => {
  await enter(page, 1, { amount: '1,000', rate: '12', length: '1' })
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$1,010.00')
  await expect(figure(page, 1, 'Final payment')).toHaveCount(0)
  await expect(figure(page, 1, 'Total interest')).toHaveText('$10.00')
})

test('S-1.6, S-2.6: the largest values are shown in full and fit their panel', async ({ page }) => {
  await enter(page, 1, { amount: '100,000,000', rate: '50', length: '120', fee: '10' })
  const emi = figure(page, 1, 'Monthly payment (EMI)')
  await expect(emi).toHaveText('$4,197,969.76')
  await expect(figure(page, 1, 'Total interest')).toHaveText('$403,756,375.72')
  await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$413,756,375.72')

  const panel = (await resultsPanel(page).boundingBox())!
  for (const label of ['Monthly payment (EMI)', 'Total cost of borrowing']) {
    const value = (await figure(page, 1, label).boundingBox())!
    expect(value.x + value.width).toBeLessThanOrEqual(panel.x + panel.width)
  }
  expect(await scrollsSideways(page)).toBe(false)
})

test('S-1.3: switching to years keeps the number typed and recalculates', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '12', length: '5' })
  await choose(page, 1, 'Loan length unit', 'years')
  await expect(box(page, 1, 'Loan length')).toHaveValue('5')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$2,224.44')
})

test('S-1.8: commas, spaces and a leading $ are all read correctly', async ({ page }) => {
  await enter(page, 1, { rate: '12', length: '12' })
  for (const amount of ['1,00,000', ' 100000 ', '$100,000']) {
    await box(page, 1, 'Amount borrowed').fill(amount)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
  }
})

test('S-3.2, S-3.3: the fee changes what you receive, never the EMI', async ({ page }) => {
  await enter(page, 1, A)
  await box(page, 1, 'Upfront fee').fill('10')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
  await expect(figure(page, 1, 'Amount received')).toHaveText('$90,000.00')
  await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$16,618.53')

  await choose(page, 1, 'Upfront fee type', 'fixed amount')
  await box(page, 1, 'Upfront fee').fill('5,000')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
  await expect(figure(page, 1, 'Amount received')).toHaveText('$95,000.00')
  await expect(figure(page, 1, 'Total cost of borrowing')).toHaveText('$11,618.53')
})

test('S-3.9: the repayment bar splits the total repaid into the fee, the interest and the cash received', async ({ page }) => {
  await enter(page, 1, A)
  await expect(resultsPanel(page).getByRole('img')).toHaveAccessibleName(
    'Total repaid $106,618.53, made up of upfront fee $2,000.00, total interest $6,618.53 and amount received $98,000.00',
  )
})

test.describe('with the browser in German', () => {
  test.use({ locale: 'de-DE' })

  test('S-1.10: amounts still read $8,884.88', async ({ page }) => {
    expect(await page.evaluate(() => navigator.language)).toBe('de-DE')
    await enter(page, 1, A)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
  })
})
