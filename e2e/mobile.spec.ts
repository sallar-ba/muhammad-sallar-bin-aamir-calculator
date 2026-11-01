import { expect, test } from '@playwright/test'
import { addButton, B1, B2, B3, enterOffers, offer, resultsPanel, scrollsSideways, themeSwitch } from './helpers.ts'

test.skip(({ isMobile }) => !isMobile, 'phone layout checks run in the mobile project')

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`a 375px phone in the ${colorScheme} theme`, () => {
    test.use({ viewport: { width: 375, height: 812 }, colorScheme })

    test('S-1.11: nothing scrolls sideways with no offers, one offer or three', async ({ page }) => {
      await page.goto('/')
      expect(await scrollsSideways(page)).toBe(false)
      await enterOffers(page, B1)
      expect(await scrollsSideways(page)).toBe(false)
      await addButton(page).click()
      await page.getByLabel('Annual interest rate (%)').last().fill('12')
      await addButton(page).click()
      expect(await scrollsSideways(page)).toBe(false)
    })
  })
}

test.describe('on a phone', () => {
  test('offers come first, then the results, then the add button', async ({ page }) => {
    await page.goto('/')
    await enterOffers(page, B1)
    const offerBox = (await offer(page, 1).boundingBox())!
    const resultsBox = (await resultsPanel(page).boundingBox())!
    const addBox = (await addButton(page).boundingBox())!
    expect(resultsBox.y).toBeGreaterThan(offerBox.y + offerBox.height)
    expect(addBox.y).toBeGreaterThan(resultsBox.y + resultsBox.height)
  })

  test('every box, choice and button is at least 44px tall, so it is easy to tap', async ({ page }) => {
    await page.goto('/')
    await enterOffers(page, B1, B2, B3)
    const targets = page.locator('main input, main select, button')
    const heights = await targets.evaluateAll((els) =>
      els.map((el) => [el.getAttribute('aria-label') ?? el.textContent?.trim(), el.getBoundingClientRect().height] as const),
    )
    expect(heights.length).toBeGreaterThan(20)
    for (const [name, height] of heights) expect(height, `${name} is ${height}px tall`).toBeGreaterThanOrEqual(44)
  })

  test('the theme switch is within reach at the top', async ({ page }) => {
    await page.goto('/')
    await expect(themeSwitch(page)).toBeInViewport()
  })
})
