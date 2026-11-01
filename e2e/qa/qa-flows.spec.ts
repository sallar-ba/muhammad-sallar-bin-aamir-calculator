// User flows end to end, theme behaviour and privacy.
import {
  ADD_TO_COMPARE,
  addButton,
  amountBox,
  DISCLAIMER,
  ex,
  expect,
  figure,
  fillOffer,
  fillOffers,
  offerCard,
  offerCards,
  offerMessages,
  panel,
  PLACEHOLDER,
  rateBox,
  removeButton,
  resultsOf,
  test,
  themeButton,
  themes,
} from './qa-helpers.ts'

const theme = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.dataset.theme)
const background = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

for (const colorScheme of themes) {
  test.describe(`first visit with the system in ${colorScheme}`, () => {
    test.use({ colorScheme })

    test('S-4.7: one empty offer, placeholder, no figures, disclaimer, matching theme', async ({ page }) => {
      await page.goto('/')
      expect(await theme(page)).toBe(colorScheme)
      await expect(themeButton(page)).toHaveAttribute('aria-pressed', String(colorScheme === 'dark'))
      await expect(offerCards(page)).toHaveCount(1)
      await expect(offerCard(page, 1)).toContainText(PLACEHOLDER)
      await expect(page.getByRole('region', { name: /results$/ })).toHaveCount(0)
      await expect(page.getByText(/^Lowest /)).toHaveCount(0)
      await expect(panel(page)).not.toContainText(ADD_TO_COMPARE)
      await expect(page.getByText(DISCLAIMER)).toBeVisible()
      await expect(page).toHaveTitle('Loan & EMI Calculator')
    })

    test('single offer flow: enter, correct a mistake, see results, reload clears (S-8.3)', async ({ page }) => {
      await page.goto('/')
      await fillOffer(page, 1, { ...ex.A, rate: '120' })
      await rateBox(page, 1).blur()
      await expect(offerMessages(page, 1)).toHaveText(['Interest rate: Enter a rate between 0% and 50%.'])
      await rateBox(page, 1).fill('12')
      await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
      await expect(panel(page)).toContainText(ADD_TO_COMPARE)
      await page.reload()
      await expect(amountBox(page, 1)).toHaveValue('')
      await expect(resultsOf(page, 1)).toHaveCount(0)
      expect(await theme(page)).toBe(colorScheme)
    })

    test('comparing flow: three offers, remove the worst, carry on editing', async ({ page }) => {
      await page.goto('/')
      await fillOffers(page, ex.B1, ex.B2, ex.B3)
      await removeButton(page, 3).click()
      await expect(offerCards(page)).toHaveCount(2)
      await expect(panel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
      await expect(panel(page)).toContainText('Offer 2 has the lowest monthly payment: $8,303.58.')
      await rateBox(page, 2).fill('11')
      await expect(panel(page)).toContainText('Offer 2 has the lowest total cost: $52,148.42.')
    })
  })
}

test.describe('theme switch', () => {
  test.use({ colorScheme: 'light' })

  test('switches, is remembered across reloads, and changes the colours', async ({ page }) => {
    await page.goto('/')
    const lightBg = await background(page)
    await themeButton(page).click()
    expect(await theme(page)).toBe('dark')
    await expect(themeButton(page)).toHaveAttribute('aria-pressed', 'true')
    expect(await background(page)).not.toBe(lightBg)
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')
    await page.reload()
    expect(await theme(page)).toBe('dark')
    await themeButton(page).click()
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
    await page.reload()
    expect(await theme(page)).toBe('light')
  })

  test('follows the system until a theme is picked, then stops following', async ({ page }) => {
    await page.goto('/')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => theme(page)).toBe('dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => theme(page)).toBe('light')
    await themeButton(page).click() // picks dark
    await page.emulateMedia({ colorScheme: 'light' })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.emulateMedia({ colorScheme: 'light' })
    expect(await theme(page)).toBe('dark')
  })

  test('switching theme keeps everything typed and shown', async ({ page }) => {
    await page.goto('/')
    await fillOffers(page, ex.B1, ex.B2)
    await themeButton(page).click()
    await expect(rateBox(page, 2)).toHaveValue('12')
    await expect(panel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
  })

  test('a saved dark theme is on <html> before any app script runs (no flash)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
    let themeAtFirstScript: string | undefined
    await page.route('**/assets/*.js', async (route) => {
      themeAtFirstScript = await page.evaluate(() => document.documentElement.dataset.theme).catch(() => undefined)
      await route.continue()
    })
    await page.goto('/')
    expect(themeAtFirstScript).toBe('dark')
  })

  test('still works when storage is blocked (private modes)', async ({ page }) => {
    await page.addInitScript(() => {
      const blocked = () => {
        throw new DOMException('blocked', 'SecurityError')
      }
      Object.defineProperty(window, 'localStorage', { get: blocked })
    })
    await page.goto('/')
    await themeButton(page).click()
    expect(await theme(page)).toBe('dark')
    await fillOffer(page, 1, ex.A)
    await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
  })

  test('an unexpected saved value falls back to the system theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'purple'))
    await page.goto('/')
    expect(await theme(page)).toBe('light')
  })
})

test.describe('privacy (S-8)', () => {
  test('every request stays on the page origin and nothing typed is sent or stored', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => requests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`))
    await page.goto('/')
    await fillOffers(page, { amount: '123,456.78', rate: '12', length: '12' }, { amount: '123,456.78', rate: '13.37', length: '24' })
    await addButton(page).click()
    await rateBox(page, 3).fill('9.87')
    const origin = new URL(baseURL!).origin
    for (const r of requests) {
      expect(r.split(' ')[1].startsWith(origin) || r.split(' ')[1].startsWith('data:'), r).toBe(true)
      expect(r).not.toMatch(/123[,.]?456|13\.37|9\.87/)
    }
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie)
    expect(stored).not.toMatch(/123|13\.37|9\.87/)
  })

  test('S-8.2: works offline once loaded', async ({ page, context }) => {
    await page.goto('/')
    await context.setOffline(true)
    await fillOffers(page, ex.B1, ex.B2)
    await expect(panel(page)).toContainText('Offer 1 has the lowest total cost: $53,582.58.')
    await context.setOffline(false)
  })

  test('S-8.4: no name, phone, email or sign-in fields', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('input[type=email], input[type=tel], input[type=password], input[autocomplete*=name]')).toHaveCount(0)
    await expect(page.getByText(/sign in|log in|email|phone/i)).toHaveCount(0)
  })
})
