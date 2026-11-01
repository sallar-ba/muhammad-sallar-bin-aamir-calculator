import { expect, test } from '@playwright/test'
import { A, box, enter, figure } from './helpers.ts'

test('S-8.1: nothing typed is sent over the network', async ({ page }) => {
  await page.goto('/')
  const sent: string[] = []
  page.on('request', (request) =>
    sent.push([request.url(), request.postData() ?? '', JSON.stringify(request.headers())].join(' ')),
  )
  await enter(page, 1, { ...A, amount: '123,456.78' })
  await box(page, 1, 'Annual interest rate (%)').fill('11')
  await expect(figure(page, 1, 'Amount borrowed')).toHaveText('$123,456.78')
  for (const typed of ['123456.78', '123,456.78', '123%2C456.78']) {
    expect(sent.filter((line) => line.includes(typed))).toEqual([])
  }
})

test('S-8.2: once loaded, it works offline', async ({ page, context }) => {
  await page.goto('/')
  await context.setOffline(true)
  await enter(page, 1, A)
  await expect(figure(page, 1, 'Monthly payment (EMI)')).toHaveText('$8,884.88')
})

test('S-8.4: it never asks for personal details or a sign-in', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('input[type="email"], input[type="tel"], input[type="password"]')).toHaveCount(0)
  await expect(page.getByText(/sign in|log in|email|phone/i)).toHaveCount(0)
})
