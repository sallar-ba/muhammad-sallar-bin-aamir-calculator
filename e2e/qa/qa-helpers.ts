// QA helpers, written independently of e2e/helpers.ts. Every QA test fails if the page throws,
// logs a console error or opens a dialog (brief: invalid input must never crash the app).
import { test as base, expect, type Locator, type Page } from '@playwright/test'

export { expect }

export const test = base.extend<{ pageProblems: string[] }>({
  pageProblems: [
    async ({ page }, use) => {
      const problems: string[] = []
      page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`))
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`)
      })
      page.on('dialog', async (dialog) => {
        problems.push(`dialog: ${dialog.message()}`)
        await dialog.dismiss()
      })
      await use(problems)
      expect(problems, 'no uncaught errors, console errors or dialogs').toEqual([])
    },
    { auto: true },
  ],
})

export const themes = ['light', 'dark'] as const

export interface OfferValues {
  amount?: string
  rate?: string
  length?: string
  unit?: 'months' | 'years'
  fee?: string
  feeType?: 'percent' | 'fixed'
}

export const ex = {
  A: { amount: '100,000', rate: '12', length: '12', fee: '2' },
  B1: { amount: '250,000', rate: '12.5', length: '36', fee: '1' },
  B2: { amount: '250,000', rate: '12', length: '36', fee: '3' },
  B3: { amount: '250,000', rate: '12', length: '60' },
  MAX: { amount: '100,000,000', rate: '50', length: '120', fee: '10' },
} satisfies Record<string, OfferValues>

export const offerCard = (page: Page, n: number) => page.getByRole('region', { name: `Offer ${n}`, exact: true })
export const offerCards = (page: Page) => page.getByRole('region', { name: /^Offer \d+$/ })
export const resultsOf = (page: Page, n: number) => page.getByRole('region', { name: `Offer ${n} results`, exact: true })
export const panel = (page: Page) => page.getByRole('region', { name: 'Results', exact: true })
export const amountBox = (page: Page, n: number) => offerCard(page, n).getByRole('textbox', { name: 'Amount borrowed', exact: true })
export const rateBox = (page: Page, n: number) => offerCard(page, n).getByRole('textbox', { name: 'Annual interest rate (%)', exact: true })
export const lengthBox = (page: Page, n: number) => offerCard(page, n).getByRole('textbox', { name: 'Loan length', exact: true })
export const feeBox = (page: Page, n: number) => offerCard(page, n).getByRole('textbox', { name: 'Upfront fee', exact: true })
export const unitChoice = (page: Page, n: number) => offerCard(page, n).getByRole('combobox', { name: 'Loan length unit', exact: true })
export const feeChoice = (page: Page, n: number) => offerCard(page, n).getByRole('combobox', { name: 'Upfront fee type', exact: true })
export const addButton = (page: Page) => page.getByRole('button', { name: 'Add another offer', exact: true })
export const removeButton = (page: Page, n: number) => page.getByRole('button', { name: `Remove offer ${n}`, exact: true })
export const themeButton = (page: Page) => page.getByRole('button', { name: 'Dark theme', exact: true })
/** The Results panel's live region (each offer's message list is a live region too). */
export const liveRegion = (page: Page) => panel(page).locator('[aria-live]')

export const PLACEHOLDER = 'Enter the amount borrowed, interest rate and loan length to see results.'
export const RESULTS_WHEN_VALID = 'Results appear once every box has a valid value.'
export const ADD_TO_COMPARE = 'Add another offer to compare.'
export const COMPLETE_TO_COMPARE = 'Complete another offer to compare.'

/** The name each message starts with ("Interest rate: Enter a rate …"). */
export const BOX_NAMES = { amount: 'Amount borrowed', rate: 'Interest rate', length: 'Loan length', fee: 'Upfront fee' } as const
export const named = (box: keyof typeof BOX_NAMES, message: string) => `${BOX_NAMES[box]}: ${message}`

const OPTION_TEXT = { months: 'months', years: 'years', percent: '% of amount', fixed: 'fixed amount' } as const

/** Picks an option in a dropdown (a listbox, not a native select): open the trigger, click the option. */
export async function choose(page: Page, n: number, which: 'unit' | 'feeType', value: keyof typeof OPTION_TEXT) {
  const trigger = which === 'unit' ? unitChoice(page, n) : feeChoice(page, n)
  if ((await trigger.textContent())?.trim() === OPTION_TEXT[value]) return
  await trigger.click()
  await page.getByRole('option', { name: OPTION_TEXT[value], exact: true }).click()
  await expect(trigger).toHaveText(OPTION_TEXT[value])
}
export const DIFFERENT_AMOUNTS =
  "These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them."
export const DISCLAIMER = "Estimates only. Your lender's figures may differ slightly because of rounding."

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The <dd> shown for a label such as "Monthly payment (EMI)" in an offer's results. */
export const figure = (page: Page, n: number, label: string) =>
  resultsOf(page, n)
    .locator('dt')
    .filter({ hasText: new RegExp(`^${escape(label)}$`) })
    .locator('xpath=following-sibling::dd[1]')

export async function fillOffer(page: Page, n: number, v: OfferValues) {
  if (v.amount !== undefined) await amountBox(page, n).fill(v.amount)
  if (v.rate !== undefined) await rateBox(page, n).fill(v.rate)
  if (v.length !== undefined) await lengthBox(page, n).fill(v.length)
  if (v.unit) await choose(page, n, 'unit', v.unit)
  if (v.feeType) await choose(page, n, 'feeType', v.feeType)
  if (v.fee !== undefined) await feeBox(page, n).fill(v.fee)
}

/** Fills Offer 1, then adds and fills one offer per extra entry. */
export async function fillOffers(page: Page, ...offers: OfferValues[]) {
  for (const [i, v] of offers.entries()) {
    if (i > 0) await addButton(page).click()
    await fillOffer(page, i + 1, v)
  }
}

/** The message tied to a box through aria-describedby, or null when there is none. */
export async function describedMessage(box: Locator): Promise<string | null> {
  const ids = await box.getAttribute('aria-describedby')
  if (!ids) return null
  const texts = await Promise.all(ids.split(/\s+/).map((id) => box.page().locator(`[id="${id}"]`).textContent()))
  return texts.join(' ').trim()
}

/** Messages listed under an offer's sentence (not the results placeholder). */
export const offerMessages = (page: Page, n: number) => offerCard(page, n).getByRole('listitem')

export const parseMoney = (text: string) => Math.round(Number(text.replace(/[$,]/g, '')) * 100)

export const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
