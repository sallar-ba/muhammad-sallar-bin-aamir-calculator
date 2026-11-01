import { expect, test, type Page } from '@playwright/test'
import { A, B1, B2, B3, box, enter, enterOffers, scrollsSideways } from './helpers.ts'

// Captures the main states in both themes for review (saved under test-results/screens),
// and checks each one for console errors and sideways scrolling.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' })

    test(`main states render cleanly`, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
      page.on('pageerror', (error) => errors.push(error.message))

      const capture = async (state: string) => {
        expect(await scrollsSideways(page), `${state} scrolls sideways`).toBe(false)
        // Settle every transition so captures are repeatable and can be compared run to run.
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' })
        await page.screenshot({
          path: `test-results/screens/${testInfo.project.name}-${colorScheme}-${state}.png`,
          fullPage: true,
        })
      }

      await page.goto('/')
      await capture('1-empty')
      await enter(page, 1, A)
      await capture('2-one-offer')
      await page.reload()
      await enterOffers(page, B1, B2, B3)
      await capture('3-three-offers')
      await page.reload()
      await invalidOffer(page)
      await capture('4-errors')
      expect(errors).toEqual([])
    })
  })
}

async function invalidOffer(page: Page) {
  await enter(page, 1, { amount: '999', rate: '60', length: '12' })
  await box(page, 1, 'Loan length').press('Tab')
}
