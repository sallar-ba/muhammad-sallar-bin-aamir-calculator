import type { Page } from '@playwright/test'

// Example offers from docs/user-stories.md.
export interface Entry {
  amount?: string
  rate?: string
  length?: string
  years?: boolean
  fee?: string
  fixedFee?: boolean
}

export const A: Entry = { amount: '100,000', rate: '12', length: '12', fee: '2' }
export const B1: Entry = { amount: '250,000', rate: '12.5', length: '36', fee: '1' }
export const B2: Entry = { amount: '250,000', rate: '12', length: '36', fee: '3' }
export const B3: Entry = { amount: '250,000', rate: '12', length: '60' }

export const offer = (page: Page, n: number) => page.getByRole('region', { name: `Offer ${n}`, exact: true })
export const offers = (page: Page) => page.getByRole('region', { name: /^Offer \d$/ })
export const results = (page: Page, n: number) => page.getByRole('region', { name: `Offer ${n} results`, exact: true })
export const resultsPanel = (page: Page) => page.getByRole('region', { name: 'Results', exact: true })
export const box = (page: Page, n: number, label: string) => offer(page, n).getByLabel(label, { exact: true })
export const addButton = (page: Page) => page.getByRole('button', { name: 'Add another offer', exact: true })
export const themeSwitch = (page: Page) => page.getByRole('button', { name: 'Dark theme', exact: true })

/** The value shown next to a figure's label in an offer's results, e.g. "Monthly payment (EMI)". */
export const figure = (page: Page, n: number, label: string) => results(page, n).locator(`dt:text-is("${label}") + dd`)

export async function enter(page: Page, n: number, entry: Entry) {
  if (entry.amount !== undefined) await box(page, n, 'Amount borrowed').fill(entry.amount)
  if (entry.rate !== undefined) await box(page, n, 'Annual interest rate (%)').fill(entry.rate)
  if (entry.length !== undefined) await box(page, n, 'Loan length').fill(entry.length)
  if (entry.years) await choose(page, n, 'Loan length unit', 'years')
  if (entry.fixedFee) await choose(page, n, 'Upfront fee type', 'fixed amount')
  if (entry.fee !== undefined) await box(page, n, 'Upfront fee').fill(entry.fee)
}

/** Picks an option in one of the dropdowns, which are listboxes rather than native selects. */
export async function choose(page: Page, n: number, label: string, option: string) {
  await box(page, n, label).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

/** Enters each offer in turn, adding offers as needed. */
export async function enterOffers(page: Page, ...entries: Entry[]) {
  for (const [i, entry] of entries.entries()) {
    if (i > 0) await addButton(page).click()
    await enter(page, i + 1, entry)
  }
}

export const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
