// Comparison rules (README "Offers and comparison", S-4, S-5, S-7, S-12), checked with figures from the QA reference.
import {
  ADD_TO_COMPARE,
  COMPLETE_TO_COMPARE,
  named,
  addButton,
  amountBox,
  DIFFERENT_AMOUNTS,
  ex,
  expect,
  feeBox,
  figure,
  fillOffer,
  fillOffers,
  lengthBox,
  liveRegion,
  offerCard,
  offerCards,
  offerMessages,
  panel,
  rateBox,
  removeButton,
  resultsOf,
  test,
  themes,
} from './qa-helpers.ts'
import type { Page } from '@playwright/test'

const badges = (page: Page, n: number) => resultsOf(page, n).locator('h3 ~ span')
const costsMore = (page: Page, n: number) => resultsOf(page, n).getByText(/^Costs \$[\d,.]+ more in total$/)

for (const colorScheme of themes) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    test('B1, B2, B3: labels, differences and summary (S-4.1, S-5.1)', async ({ page }) => {
      await page.goto('/')
      await fillOffers(page, ex.B1, ex.B2, ex.B3)
      await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
      await expect(badges(page, 2)).toHaveText([])
      await expect(badges(page, 3)).toHaveText(['Lowest monthly payment'])
      await expect(costsMore(page, 1)).toHaveCount(0)
      await expect(costsMore(page, 2)).toHaveText('Costs $2,846.15 more in total')
      await expect(costsMore(page, 3)).toHaveText('Costs $30,084.20 more in total')
      await expect(panel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
      await expect(panel(page)).toContainText('Offer 3 has the lowest monthly payment: $5,561.11.')
      // The winning total cost is highlighted (S-4.1).
      await expect(figure(page, 1, 'Total cost of borrowing').locator('mark')).toHaveText('$53,582.58')
      await expect(figure(page, 2, 'Total cost of borrowing').locator('mark')).toHaveCount(0)
    })
  })
}

test('partial tie (S-4.3): tied offers say "(tied)", show no difference, summary says they tie', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, ex.B1, ex.B1, ex.B3)
  for (const n of [1, 2]) {
    await expect(badges(page, n)).toHaveText(['Lowest total cost (tied)'])
    await expect(costsMore(page, n)).toHaveCount(0)
  }
  await expect(badges(page, 3)).toHaveText(['Lowest monthly payment'])
  await expect(costsMore(page, 3)).toHaveText('Costs $30,084.20 more in total')
  await expect(panel(page)).toContainText('Offers 1 and 2 tie for the lowest total cost: $53,582.58.')
})

test('full tie (S-4.4): every offer gets both labels with "(tied)" and no difference', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, ex.B1, ex.B1, ex.B1)
  for (const n of [1, 2, 3]) {
    await expect(badges(page, n)).toHaveText(['Lowest total cost (tied)', 'Lowest monthly payment (tied)'])
    await expect(costsMore(page, n)).toHaveCount(0)
  }
  await expect(panel(page)).toContainText('Offers 1, 2 and 3 tie for the lowest total cost: $53,582.58.')
  await expect(panel(page)).toContainText('Offers 1, 2 and 3 tie for the lowest monthly payment: $8,363.41.')
})

test('EMI tie only (S-5.3): the fee does not change the EMI', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, ex.A, { ...ex.A, feeType: 'fixed', fee: '5,000' })
  await expect(badges(page, 1)).toHaveText(['Lowest total cost', 'Lowest monthly payment (tied)'])
  await expect(badges(page, 2)).toHaveText(['Lowest monthly payment (tied)'])
  await expect(costsMore(page, 2)).toHaveText('Costs $3,000.00 more in total')
})

test('0% offer with a fee loses to an 8% offer without one (S-4.2)', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, { amount: '100,000', rate: '0', length: '12', fee: '5' }, { amount: '100,000', rate: '8', length: '12' })
  await expect(badges(page, 2)).toContainText(['Lowest total cost'])
  await expect(figure(page, 2, 'Total cost of borrowing')).toHaveText('$4,386.11')
  await expect(costsMore(page, 1)).toHaveText('Costs $613.89 more in total')
})

test.describe('different amounts borrowed', () => {
  test('two offers (S-4.8): results shown, no labels, the message appears', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, { ...ex.B2, amount: '200,000' })
    await expect(resultsOf(page, 1)).toBeVisible()
    await expect(resultsOf(page, 2)).toBeVisible()
    await expect(badges(page, 1)).toHaveCount(0)
    await expect(badges(page, 2)).toHaveCount(0)
    await expect(panel(page).getByText(/more in total/)).toHaveCount(0)
    await expect(panel(page)).toContainText(DIFFERENT_AMOUNTS)
  })

  test('three offers where only one amount differs are not ranked at all', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2, { ...ex.B3, amount: '250,000.01' })
    await expect(panel(page)).toContainText(DIFFERENT_AMOUNTS)
    await expect(panel(page).getByText(/^Lowest /)).toHaveCount(0)
  })

  test('the same amount typed differently counts as the same amount', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, { ...ex.B1, amount: '$250,000' }, { ...ex.B2, amount: '250000.00' }, { ...ex.B3, amount: '2,50,000' })
    await expect(panel(page)).not.toContainText(DIFFERENT_AMOUNTS)
    await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
  })

  test('S-7.3: changing one amount removes the labels; changing it back restores them', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2, ex.B3)
    await amountBox(page, 3).fill('200,000')
    await expect(panel(page)).toContainText(DIFFERENT_AMOUNTS)
    await expect(panel(page).getByText(/^Lowest /)).toHaveCount(0)
    await amountBox(page, 3).fill('250,000')
    await expect(panel(page)).not.toContainText(DIFFERENT_AMOUNTS)
    await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
  })
})

test.describe('offers becoming invalid', () => {
  test('S-7.2: an offer with an invalid rate drops out and comes back', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2, ex.B3)
    await rateBox(page, 1).fill('60')
    await expect(resultsOf(page, 1)).toHaveCount(0)
    await expect(badges(page, 2)).toHaveText(['Lowest total cost'])
    await expect(badges(page, 3)).toHaveText(['Lowest monthly payment'])
    await expect(costsMore(page, 3)).toHaveText('Costs $27,238.05 more in total')
    await rateBox(page, 1).fill('12.5')
    await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
    await expect(costsMore(page, 2)).toHaveText('Costs $2,846.15 more in total')
  })

  test('an invalid offer in the middle: offers 1 and 3 are still compared under their own numbers', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, { ...ex.B2, length: '0' }, ex.B3)
    await expect(resultsOf(page, 2)).toHaveCount(0)
    await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
    await expect(badges(page, 3)).toHaveText(['Lowest monthly payment'])
    await expect(costsMore(page, 3)).toHaveText('Costs $30,084.20 more in total')
    await expect(panel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
    await expect(panel(page)).toContainText('Offer 3 has the lowest monthly payment: $5,561.11.')
  })

  test('S-4.6 and S-7.4: one valid offer left shows no labels and "Complete another offer to compare."', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, { ...ex.B2, rate: '60' })
    await expect(panel(page)).toContainText(COMPLETE_TO_COMPARE)
    await expect(panel(page)).not.toContainText(ADD_TO_COMPARE)
    await expect(panel(page).getByText(/^Lowest /)).toHaveCount(0)
    await rateBox(page, 2).fill('12')
    await expect(panel(page)).not.toContainText(COMPLETE_TO_COMPARE)
    for (const box of [amountBox, rateBox, lengthBox, feeBox]) await box(page, 2).fill('')
    await expect(panel(page)).toContainText(COMPLETE_TO_COMPARE)
    await expect(panel(page).getByText(/^Lowest /)).toHaveCount(0)
  })
})

test.describe('adding offers', () => {
  test('S-12.1, S-12.5: one offer, no Remove, and the add button', async ({ page }) => {
    await page.goto('/')
    await expect(offerCards(page)).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
    await expect(addButton(page)).toBeVisible()
  })

  test('S-12.2: a valid amount is copied and the cursor goes to the interest rate', async ({ page }) => {
    await page.goto('/')
    await amountBox(page, 1).fill('250,000')
    await addButton(page).click()
    await expect(amountBox(page, 2)).toHaveValue('250,000')
    await expect(rateBox(page, 2)).toBeFocused()
    for (const box of [rateBox, lengthBox, feeBox]) await expect(box(page, 2)).toHaveValue('')
    // Offer 2 shows no messages just for having a copied amount.
    await expect(offerMessages(page, 2)).toHaveCount(0)
  })

  test('S-12.2: an invalid amount is not copied and the cursor goes to the amount', async ({ page }) => {
    await page.goto('/')
    await amountBox(page, 1).fill('999')
    await addButton(page).click()
    await expect(amountBox(page, 2)).toHaveValue('')
    await expect(amountBox(page, 2)).toBeFocused()
  })

  test('an empty first offer gives an empty second offer with the cursor in its amount', async ({ page }) => {
    await page.goto('/')
    await addButton(page).click()
    await expect(amountBox(page, 2)).toHaveValue('')
    await expect(amountBox(page, 2)).toBeFocused()
  })

  test('a valid amount is copied even when another box in the offer is invalid', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, { amount: '250,000', rate: '75' })
    await addButton(page).click()
    await expect(amountBox(page, 2)).toHaveValue('250,000')
  })

  test('the amount comes from the last offer, not the first', async ({ page }) => {
    await page.goto('/')
    await amountBox(page, 1).fill('250,000')
    await addButton(page).click()
    await amountBox(page, 2).fill('300,000')
    await addButton(page).click()
    await expect(amountBox(page, 3)).toHaveValue('300,000')
  })

  test('S-12.3: no add button at three offers; it returns after a removal', async ({ page }) => {
    await page.goto('/')
    await addButton(page).click()
    await addButton(page).click()
    await expect(offerCards(page)).toHaveCount(3)
    await expect(addButton(page)).toHaveCount(0)
    await removeButton(page, 3).click()
    await expect(addButton(page)).toBeVisible()
    await expect(addButton(page)).toBeFocused()
  })

  test('S-7.5: adding B2 next to B1 turns on the comparison', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.B1)
    await expect(panel(page)).toContainText(ADD_TO_COMPARE)
    await addButton(page).click()
    await fillOffer(page, 2, ex.B2)
    await expect(panel(page)).not.toContainText(ADD_TO_COMPARE)
    await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
    await expect(badges(page, 2)).toHaveText(['Lowest monthly payment'])
    await expect(costsMore(page, 2)).toHaveText('Costs $2,846.15 more in total')
  })
})

test.describe('removing offers', () => {
  test('S-12.4: removing Offer 2 renumbers, re-ranks and moves the cursor to the add button', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2, ex.B3)
    await removeButton(page, 2).click()
    await expect(offerCards(page)).toHaveCount(2)
    await expect(lengthBox(page, 2)).toHaveValue('60')
    await expect(costsMore(page, 2)).toHaveText('Costs $30,084.20 more in total')
    await expect(addButton(page)).toBeFocused()
  })

  test('removing Offer 1 makes the old Offer 2 the new Offer 1', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2, ex.B3)
    await removeButton(page, 1).click()
    await expect(rateBox(page, 1)).toHaveValue('12')
    await expect(feeBox(page, 1)).toHaveValue('3')
    await expect(badges(page, 1)).toHaveText(['Lowest total cost'])
    await expect(costsMore(page, 2)).toHaveText('Costs $27,238.05 more in total')
    await expect(panel(page)).toContainText('Offer 1 has the lowest total cost: $56,428.73.')
    await expect(page.getByRole('button', { name: 'Remove offer 3' })).toHaveCount(0)
  })

  test("a showing message stays with its offer when an earlier offer is removed", async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2, { ...ex.B3, rate: '60' })
    await rateBox(page, 3).blur()
    await expect(offerMessages(page, 3)).toHaveText([named('rate', 'Enter a rate between 0% and 50%.')])
    await removeButton(page, 1).click()
    await expect(offerMessages(page, 2)).toHaveText([named('rate', 'Enter a rate between 0% and 50%.')])
    await expect(rateBox(page, 2)).toHaveAttribute('aria-invalid', 'true')
    await expect(offerMessages(page, 1)).toHaveCount(0)
  })

  test('removing down to one offer hides Remove and shows the single-offer view', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2)
    await removeButton(page, 2).click()
    await expect(page.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
    await expect(panel(page)).toContainText(ADD_TO_COMPARE)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,363.41')
  })

  test('rapid add and remove keeps numbering and focus consistent', async ({ page }) => {
    await page.goto('/')
    await fillOffer(page, 1, ex.B1)
    for (let i = 0; i < 5; i++) {
      await addButton(page).click()
      await addButton(page).click()
      await removeButton(page, 2).click()
      await removeButton(page, 2).click()
    }
    await expect(offerCards(page)).toHaveCount(1)
    await expect(offerCard(page, 1)).toBeVisible()
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,363.41')
  })
})

test('S-4.9: bars use one scale, so bar length is proportional to total repaid', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, ex.B1, ex.B2, ex.B3)
  const ratios = async () => {
    const widths = await Promise.all([1, 2, 3].map(async (n) => (await resultsOf(page, n).getByRole('img').boundingBox())!.width))
    return [widths[0] / widths[2], widths[1] / widths[2]].map((r) => Math.round(r * 100) / 100)
  }
  // Total repaid: B1 $301,082.58, B2 $298,928.73, B3 $333,666.78 (largest = full width). Bars animate for 300ms.
  await expect.poll(ratios).toEqual([Math.round((301_082.58 / 333_666.78) * 100) / 100, Math.round((298_928.73 / 333_666.78) * 100) / 100])
  // Fee and interest come first: the first segment of B3 (no fee) is interest.
  await expect(resultsOf(page, 3).getByRole('img')).toHaveAttribute('aria-label', 'Total repaid $333,666.78, made up of total interest $83,666.78 and amount received $250,000.00')
})

test('the live region announces the comparison outcome', async ({ page }) => {
  await page.goto('/')
  await fillOffers(page, ex.B1, ex.B2, ex.B3)
  await expect(liveRegion(page)).toHaveText(
    'Offer 1 has the lowest total cost: $53,582.58. Offer 3 has the lowest monthly payment: $5,561.11.',
  )
  await rateBox(page, 2).fill('11')
  await expect(liveRegion(page)).toHaveText(
    'Offer 2 has the lowest total cost: $52,148.42. Offer 3 has the lowest monthly payment: $5,561.11.',
  )
})
