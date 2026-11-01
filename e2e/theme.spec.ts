import { expect, test, type Page } from '@playwright/test'
import { themeSwitch } from './helpers.ts'

const theme = (page: Page) => page.locator('html')
const pageColour = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const CHARCOAL = 'rgb(18, 18, 20)'
const LIGHT = 'rgb(243, 244, 248)'

test.describe('when the system is dark', () => {
  test.use({ colorScheme: 'dark' })

  test('a first visit follows the system and uses the charcoal theme', async ({ page }) => {
    await page.goto('/')
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark')
    await expect(themeSwitch(page)).toHaveAttribute('aria-pressed', 'true')
    expect(await pageColour(page)).toBe(CHARCOAL)
  })

  test('a saved choice wins over the system setting', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
    await page.goto('/')
    await expect(theme(page)).toHaveAttribute('data-theme', 'light')
    expect(await pageColour(page)).toBe(LIGHT)
  })

  test('the theme is applied before the app loads, so the page never flashes light', async ({ page }) => {
    await page.route(/\/assets\/.*\.js$/, (route) => route.abort())
    await page.goto('/')
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark')
    expect(await pageColour(page)).toBe(CHARCOAL)
  })
})

test.describe('when the system is light', () => {
  test.use({ colorScheme: 'light' })

  test('a first visit follows the system', async ({ page }) => {
    await page.goto('/')
    await expect(theme(page)).toHaveAttribute('data-theme', 'light')
    await expect(themeSwitch(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await pageColour(page)).toBe(LIGHT)
  })

  test('the switch changes the theme and remembers it after a reload', async ({ page }) => {
    await page.goto('/')
    await themeSwitch(page).click()
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark')
    await expect(themeSwitch(page)).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark')
    expect(await pageColour(page)).toBe(CHARCOAL)

    await themeSwitch(page).click()
    await page.reload()
    await expect(theme(page)).toHaveAttribute('data-theme', 'light')
  })

  test('until a choice is made the page follows system changes, and after that it does not', async ({ page }) => {
    await page.goto('/')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(theme(page)).toHaveAttribute('data-theme', 'dark')

    await themeSwitch(page).click()
    await expect(theme(page)).toHaveAttribute('data-theme', 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(theme(page)).toHaveAttribute('data-theme', 'light')
  })
})
