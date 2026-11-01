import { expect, test } from '@playwright/test'
import { A, B1, box, enter, enterOffers, figure, offer, results } from './helpers.ts'

const NOT_A_NUMBER = 'Enter a number using only digits, a decimal point and commas.'
const DECIMALS = 'Use no more than 2 decimal places.'
const AMOUNT_RANGE = 'Enter an amount between $1,000 and $100,000,000.'
const RATE_RANGE = 'Enter a rate between 0% and 50%.'
const MONTHS = 'Enter a whole number of months between 1 and 120.'
const YEARS = 'Enter a whole number of years between 1 and 10.'
const FEE_PERCENT = 'Enter a fee between 0% and 10%.'
const FEE_FIXED = 'Enter a fee of $0 or more, less than the amount borrowed.'

const AMOUNT = 'Amount borrowed'
const RATE = 'Annual interest rate (%)'
const LENGTH = 'Loan length'
const FEE = 'Upfront fee'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

// S-6.1: the whole table, one test per row. S-6.10: none of them breaks the page.
const rows: [box: string, value: string, message: string, setup?: { years?: boolean; fixedFee?: boolean }][] = [
  [AMOUNT, '', 'Enter the amount borrowed.'],
  [AMOUNT, 'abc', NOT_A_NUMBER],
  [AMOUNT, '1e5', NOT_A_NUMBER],
  [AMOUNT, '1.2.3', NOT_A_NUMBER],
  [AMOUNT, '100000.555', DECIMALS],
  [AMOUNT, '999.99', AMOUNT_RANGE],
  [AMOUNT, '100,000,000.01', AMOUNT_RANGE],
  [AMOUNT, '-5000', AMOUNT_RANGE],
  [AMOUNT, '99999999999999999999', AMOUNT_RANGE],
  [RATE, '', 'Enter the interest rate.'],
  [RATE, '12%', NOT_A_NUMBER],
  [RATE, '12.555', DECIMALS],
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

for (const [label, value, message, setup] of rows) {
  test(`S-6.1: ${label} "${value}" shows "${message}"`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await enter(page, 1, { ...A, ...setup })
    await box(page, 1, label).fill(value)
    await box(page, 1, label).press('Tab')
    await expect(offer(page, 1).getByText(message, { exact: true })).toBeVisible()
    await expect(box(page, 1, label)).toHaveAttribute('aria-invalid', 'true')
    await expect(results(page, 1)).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('S-6.3, S-6.4: the message waits until you leave the box, then clears as you correct it', async ({ page }) => {
  await enter(page, 1, A)
  await box(page, 1, AMOUNT).fill('999')
  await expect(results(page, 1)).toHaveCount(0)
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toHaveCount(0)

  await box(page, 1, AMOUNT).press('Tab')
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toBeVisible()

  await box(page, 1, AMOUNT).fill('100,000')
  await expect(box(page, 1, AMOUNT)).toBeFocused()
  await expect(offer(page, 1).getByText(AMOUNT_RANGE)).toHaveCount(0)
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
})

test('S-6.5: each box keeps its own message until it is fixed', async ({ page }) => {
  await enter(page, 1, A)
  await box(page, 1, AMOUNT).fill('abc')
  await box(page, 1, RATE).fill('60')
  await box(page, 1, RATE).press('Tab')
  await expect(offer(page, 1).getByText(NOT_A_NUMBER)).toBeVisible()
  await expect(offer(page, 1).getByText(RATE_RANGE)).toBeVisible()

  await box(page, 1, AMOUNT).fill('100,000')
  await expect(offer(page, 1).getByText(NOT_A_NUMBER)).toHaveCount(0)
  await expect(offer(page, 1).getByText(RATE_RANGE)).toBeVisible()
  await expect(results(page, 1)).toHaveCount(0)

  await box(page, 1, RATE).fill('12')
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
})

test('S-6.7: a required message appears only for boxes you have visited', async ({ page }) => {
  await box(page, 1, AMOUNT).fill('100,000')
  await box(page, 1, AMOUNT).press('Tab')
  await box(page, 1, RATE).press('Tab')
  await expect(offer(page, 1).getByText('Enter the interest rate.')).toBeVisible()
  await expect(offer(page, 1).getByText('Enter the loan length.')).toHaveCount(0)
})

test('S-6.8: clearing every box removes the messages', async ({ page }) => {
  await box(page, 1, AMOUNT).fill('abc')
  await box(page, 1, AMOUNT).press('Tab')
  await expect(offer(page, 1).getByText(NOT_A_NUMBER)).toBeVisible()
  await box(page, 1, AMOUNT).fill('')
  await expect(offer(page, 1).getByText(NOT_A_NUMBER)).toHaveCount(0)
  await expect(offer(page, 1).getByText('Enter the amount borrowed.')).toHaveCount(0)
})

test('S-3.7, S-3.8: lowering the amount below a fixed fee flags the fee until the fee is fixed', async ({ page }) => {
  await enter(page, 1, { amount: '100,000', rate: '12', length: '12', fixedFee: true, fee: '5,000' })
  await box(page, 1, FEE).press('Tab')
  await box(page, 1, AMOUNT).fill('4,000')
  await box(page, 1, AMOUNT).press('Tab')
  await expect(offer(page, 1).getByText(FEE_FIXED)).toBeVisible()
  await expect(box(page, 1, FEE)).toHaveAttribute('aria-invalid', 'true')

  await box(page, 1, FEE).fill('500')
  await expect(offer(page, 1).getByText(FEE_FIXED)).toHaveCount(0)
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$355.40')
  await expect(figure(page, 1, 'Amount received')).toHaveText('$3,500.00')
})

test('S-6.9: an invalid offer does not stop the others from working', async ({ page }) => {
  await enterOffers(page, B1, { rate: '60' })
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,363.41')
})
