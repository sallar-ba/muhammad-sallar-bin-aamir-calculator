import { expect, test } from '@playwright/test'
import { addButton, B1, B2, B3, box, enter, enterOffers, offer, offers, results } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('S-12.1, S-12.5, S-4.7: the page starts with one empty offer that cannot be removed', async ({ page }) => {
  await expect(offers(page)).toHaveCount(1)
  await expect(offer(page, 1).getByRole('button', { name: /Remove/ })).toHaveCount(0)
  await expect(offer(page, 1)).toContainText('Enter the amount borrowed, interest rate and loan length to see results.')
  await expect(addButton(page)).toBeVisible()
})

test('S-12.2: a new offer copies a valid amount and puts the cursor in its rate', async ({ page }) => {
  await enter(page, 1, B1)
  await addButton(page).click()
  await expect(box(page, 2, 'Amount borrowed')).toHaveValue('250,000')
  await expect(box(page, 2, 'Annual interest rate (%)')).toBeFocused()
})

test('S-12.2: an invalid amount is not copied, and the cursor goes to the new amount', async ({ page }) => {
  await enter(page, 1, { amount: 'abc' })
  await addButton(page).click()
  await expect(box(page, 2, 'Amount borrowed')).toHaveValue('')
  await expect(box(page, 2, 'Amount borrowed')).toBeFocused()
})

test('S-12.3: no more than three offers can be added', async ({ page }) => {
  await addButton(page).click()
  await addButton(page).click()
  await expect(offers(page)).toHaveCount(3)
  await expect(addButton(page)).toHaveCount(0)
})

test('S-12.4: removing an offer renumbers the rest, re-ranks them and moves the cursor to the add button', async ({ page }) => {
  await enterOffers(page, B1, B2, B3)
  await offer(page, 2).getByRole('button', { name: 'Remove offer 2' }).click()
  await expect(offers(page)).toHaveCount(2)
  await expect(box(page, 2, 'Loan length')).toHaveValue('60')
  await expect(results(page, 2)).toContainText('Costs $30,084.20 more in total')
  await expect(addButton(page)).toBeFocused()
})

test('S-1.12: Tab goes through the theme switch, each offer in order, then the add button', async ({ page }) => {
  await enterOffers(page, B1, B2)
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  const order: string[] = []
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab')
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const where = el.closest('section[aria-labelledby]')?.querySelector('h2')?.textContent
        return `${where ? `${where}: ` : ''}${el.getAttribute('aria-label') ?? el.textContent?.trim()}`
      }),
    )
  }
  const fields = ['Amount borrowed', 'Annual interest rate (%)', 'Loan length', 'Loan length unit', 'Upfront fee', 'Upfront fee type']
  expect(order).toEqual([
    'Dark theme',
    ...fields.map((field) => `Offer 1: ${field}`),
    'Offer 1: Remove offer 1',
    ...fields.map((field) => `Offer 2: ${field}`),
    'Offer 2: Remove offer 2',
    'Add another offer',
  ])
})

test('S-8.3: reloading starts again with one empty offer', async ({ page }) => {
  await enterOffers(page, B1, B2)
  await page.reload()
  await expect(offers(page)).toHaveCount(1)
  await expect(box(page, 1, 'Amount borrowed')).toHaveValue('')
  await expect(results(page, 1)).toHaveCount(0)
})
