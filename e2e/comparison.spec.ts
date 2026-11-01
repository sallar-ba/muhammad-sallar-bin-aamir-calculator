import { expect, test } from '@playwright/test'
import { A, B1, B2, B3, box, enterOffers, results, resultsPanel } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('S-4.5: one offer is not ranked, and the panel asks for another', async ({ page }) => {
  await enterOffers(page, B1)
  await expect(results(page, 1)).not.toContainText('Lowest')
  await expect(resultsPanel(page)).toContainText('Add another offer to compare.')
})

test('S-4.1, S-5.1: three offers are labelled, the winning figures underlined and the outcome summarised', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await expect(results(page, 1)).toContainText('Lowest total cost')
  await expect(results(page, 2)).toContainText('Costs $2,846.15 more in total')
  await expect(results(page, 3)).toContainText('Lowest monthly payment')
  await expect(results(page, 3)).toContainText('Costs $30,084.20 more in total')
  await expect(results(page, 1).locator('mark.win-cost')).toHaveText('$53,582.58')
  await expect(results(page, 3).locator('mark.win-payment')).toHaveText('$5,561.11')
  await expect(resultsPanel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
  await expect(resultsPanel(page)).toContainText('Offer 3 has the lowest monthly payment: $5,561.11.')
})

test('S-4.9: every repayment bar is drawn to the same scale', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  const width = async (n: number) => (await results(page, n).getByRole('img').boundingBox())!.width
  const ratio = async (n: number) => (await width(n)) / (await width(3))
  // Total repaid: B1 $301,082.58, B2 $298,928.73, B3 $333,666.78 (the longest).
  // Adding B3 changes the shared scale and the bars animate to it, so wait for them to settle.
  await expect.poll(() => ratio(1)).toBeCloseTo(301_082.58 / 333_666.78, 2)
  await expect.poll(() => ratio(2)).toBeCloseTo(298_928.73 / 333_666.78, 2)
})

test('S-7.1: changing a rate re-ranks the offers straight away', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await box(page, 2, 'Annual interest rate (%)').fill('11')
  await expect(results(page, 2)).toContainText('Lowest total cost')
  await expect(results(page, 1)).toContainText('Costs $1,434.16 more in total')
  await expect(results(page, 3)).toContainText('Costs $31,518.36 more in total')
  await expect(resultsPanel(page)).toContainText('Offer 2 has the lowest total cost: $52,148.42.')
})

test('S-7.2: an offer that becomes invalid drops out of the ranking and comes back when fixed', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await box(page, 1, 'Annual interest rate (%)').fill('60')
  await expect(results(page, 2)).toContainText('Lowest total cost')
  await expect(results(page, 3)).toContainText('Costs $27,238.05 more in total')
  await box(page, 1, 'Annual interest rate (%)').fill('12.5')
  await expect(results(page, 1)).toContainText('Lowest total cost')
})

test('S-4.3: tied offers are both labelled and the summary says they tie', async ({ page }) => {
  await enterOffers(page, B1, B1, B3)
  await expect(results(page, 1)).toContainText('Lowest total cost (tied)')
  await expect(results(page, 2)).toContainText('Lowest total cost (tied)')
  await expect(results(page, 1)).not.toContainText('more in total')
  await expect(resultsPanel(page)).toContainText('Offers 1 and 2 tie for the lowest total cost: $53,582.58.')
})

test('S-4.2: a "0% interest" offer can cost more once its fee is counted', async ({ page }) => {
  await enterOffers(page, { amount: '100,000', rate: '0', length: '12', fee: '5' }, { amount: '100,000', rate: '8', length: '12' })
  await expect(results(page, 2)).toContainText('Lowest total cost')
  await expect(results(page, 1)).toContainText('Costs $613.89 more in total')
})

test('S-5.3: the same loan with a bigger fee ties on the monthly payment but costs more', async ({ page }) => {
  await enterOffers(page, A, { ...A, fixedFee: true, fee: '5,000' })
  await expect(results(page, 1)).toContainText('Lowest monthly payment (tied)')
  await expect(results(page, 2)).toContainText('Lowest monthly payment (tied)')
  await expect(results(page, 2)).toContainText('Costs $3,000.00 more in total')
})

test('S-4.8, S-7.3: offers for different amounts are not ranked', async ({ page }) => {
  await enterOffers(page, B1, { ...B2, amount: '200,000' })
  await expect(resultsPanel(page)).toContainText(
    "These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them.",
  )
  await expect(results(page, 1)).not.toContainText('Lowest')
  await expect(results(page, 2)).not.toContainText('Lowest')
})
