import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App'

let user: ReturnType<typeof userEvent.setup>

beforeEach(() => {
  user = userEvent.setup()
  render(<App />)
})

const editor = (n: number) => within(screen.getByRole('region', { name: `Offer ${n}` }))
const resultsCard = () => screen.getByRole('region', { name: 'Results' })
const offerResults = (n: number) => screen.queryByRole('region', { name: `Offer ${n} results` })
const box = (n: number, label: string) => editor(n).getByLabelText(label)
const addButton = () => screen.queryByRole('button', { name: 'Add another offer' })
/** The value shown next to a figure's label in an offer's results, e.g. "Monthly payment (EMI)". */
function figure(n: number, label: string) {
  const region = offerResults(n)
  return region && within(region).queryByText(label, { selector: 'dt' })?.nextElementSibling?.textContent
}

interface Entry {
  amount?: string
  rate?: string
  length?: string
  years?: boolean
  fee?: string
  fixedFee?: boolean
}

async function replace(n: number, label: string, text: string) {
  await user.clear(box(n, label))
  if (text) await user.type(box(n, label), text)
}

/** Types an offer in. A new offer may start with an amount already filled in, so the amount is replaced. */
async function enter(n: number, { amount, rate, length, years, fee, fixedFee }: Entry) {
  if (amount) await replace(n, 'Amount borrowed', amount)
  if (rate) await user.type(box(n, 'Annual interest rate (%)'), rate)
  if (length) await user.type(box(n, 'Loan length'), length)
  if (years) await choose(n, 'Loan length unit', 'years')
  if (fixedFee) await choose(n, 'Upfront fee type', 'fixed amount')
  if (fee) await user.type(box(n, 'Upfront fee'), fee)
}

/** Picks an option in one of the dropdowns, which are listboxes rather than native selects. */
async function choose(n: number, label: string, option: string) {
  await user.click(box(n, label))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function addOffer() {
  await user.click(addButton()!)
}

const A = { amount: '100,000', rate: '12', length: '12', fee: '2' }
const B1 = { amount: '250,000', rate: '12.5', length: '36', fee: '1' }
const B2 = { amount: '250,000', rate: '12', length: '36', fee: '3' }
const B3 = { amount: '250,000', rate: '12', length: '60' }
const PROMPT = 'Enter the amount borrowed, interest rate and loan length to see results.'

test('S-1.9, S-4.7, S-12.1, S-2.8: the page opens with one empty offer, no figures and the disclaimer', () => {
  expect(screen.getAllByRole('region', { name: /^Offer \d$/ })).toHaveLength(1)
  expect(editor(1).getByText(PROMPT)).toBeInTheDocument()
  expect(editor(1).queryByRole('button', { name: /Remove/ })).toBeNull()
  expect(offerResults(1)).toBeNull()
  expect(resultsCard()).not.toHaveTextContent('$')
  expect(screen.getByText("Estimates only. Your lender's figures may differ slightly because of rounding.")).toBeInTheDocument()
})

test('S-1.1, S-2.1, S-3.1, S-4.5: example A shows every figure in dollars, with borrowed and received kept apart', async () => {
  await enter(1, A)
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$8,884.88')
  expect(figure(1, 'Final payment')).toBe('$8,884.85')
  expect(figure(1, 'Total cost of borrowing')).toBe('$8,618.53')
  expect(figure(1, 'Amount borrowed')).toBe('$100,000.00')
  expect(figure(1, 'Upfront fee')).toBe('$2,000.00')
  expect(figure(1, 'Amount received')).toBe('$98,000.00')
  expect(figure(1, 'Total interest')).toBe('$6,618.53')
  expect(figure(1, 'Total repaid')).toBe('$106,618.53')
  expect(resultsCard()).toHaveTextContent('Add another offer to compare.')
})

test('S-3.9: the repayment bar splits the total repaid into the fee, the interest and the cash received', async () => {
  await enter(1, A)
  expect(within(offerResults(1)!).getByRole('img')).toHaveAccessibleName(
    'Total repaid $106,618.53, made up of upfront fee $2,000.00, total interest $6,618.53 and amount received $98,000.00',
  )
})

test('S-1.3: switching to years keeps the number typed and recalculates', async () => {
  await enter(1, { amount: '100,000', rate: '12', length: '5' })
  await choose(1, 'Loan length unit', 'years')
  expect(box(1, 'Loan length')).toHaveValue('5')
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$2,224.44')
})

test('S-2.5: no final payment line when it equals the EMI', async () => {
  await enter(1, { amount: '1,000', rate: '12', length: '1' })
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$1,010.00')
  expect(figure(1, 'Final payment')).toBeUndefined()
})

test('S-3.2: raising the fee changes what you receive but not the EMI', async () => {
  await enter(1, A)
  await replace(1, 'Upfront fee', '10')
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$8,884.88')
  expect(figure(1, 'Amount received')).toBe('$90,000.00')
  expect(figure(1, 'Total cost of borrowing')).toBe('$16,618.53')
})

test('S-6.3, S-6.4: figures hide at once, the message waits until you leave, then clears as you correct it', async () => {
  await enter(1, A)
  await replace(1, 'Amount borrowed', '999')
  expect(offerResults(1)).toBeNull()
  expect(editor(1).queryByText('Enter an amount between $1,000 and $100,000,000.')).toBeNull()

  await user.tab()
  expect(editor(1).getByText('Enter an amount between $1,000 and $100,000,000.')).toBeInTheDocument()
  expect(box(1, 'Amount borrowed')).toHaveAttribute('aria-invalid', 'true')

  await replace(1, 'Amount borrowed', '100,000')
  expect(box(1, 'Amount borrowed')).toHaveFocus()
  expect(editor(1).queryByText('Enter an amount between $1,000 and $100,000,000.')).toBeNull()
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$8,884.88')
})

test('S-6.5: each box keeps its own message until it is fixed', async () => {
  await enter(1, A)
  await replace(1, 'Amount borrowed', 'abc')
  await replace(1, 'Annual interest rate (%)', '60')
  await user.tab()
  expect(editor(1).getByText('Enter a number using only digits, a decimal point and commas.')).toBeInTheDocument()
  expect(editor(1).getByText('Enter a rate between 0% and 50%.')).toBeInTheDocument()

  await replace(1, 'Amount borrowed', '100,000')
  expect(editor(1).queryByText('Enter a number using only digits, a decimal point and commas.')).toBeNull()
  expect(editor(1).getByText('Enter a rate between 0% and 50%.')).toBeInTheDocument()
  expect(offerResults(1)).toBeNull()

  await replace(1, 'Annual interest rate (%)', '12')
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$8,884.88')
})

test('S-6.6: tabbing through an empty added offer shows no messages', async () => {
  await addOffer()
  expect(box(2, 'Amount borrowed')).toHaveFocus()
  for (let i = 0; i < 6; i++) await user.tab()
  expect(editor(2).queryAllByRole('textbox', { description: /./ })).toHaveLength(0)
  expect(editor(2).getByText(PROMPT)).toBeInTheDocument()
})

test('S-6.7: leaving a required box empty shows its message, but boxes not visited stay quiet', async () => {
  await enter(1, { amount: '100,000' })
  await user.tab() // into the rate
  await user.tab() // out of the rate, without typing
  expect(editor(1).getByText('Enter the interest rate.')).toBeInTheDocument()
  expect(editor(1).queryByText('Enter the loan length.')).toBeNull()
})

test('S-6.8: clearing every box in an offer removes its messages', async () => {
  await enter(1, { amount: 'abc' })
  await user.tab()
  expect(editor(1).getByText('Enter a number using only digits, a decimal point and commas.')).toBeInTheDocument()
  await user.clear(box(1, 'Amount borrowed'))
  expect(editor(1).queryByText('Enter a number using only digits, a decimal point and commas.')).toBeNull()
  expect(editor(1).queryByText('Enter the amount borrowed.')).toBeNull()
})

test('S-3.7, S-3.8: lowering the amount below a fixed fee flags the fee, and fixing the fee brings the figures back', async () => {
  await enter(1, { amount: '100,000', rate: '12', length: '12', fixedFee: true, fee: '5,000' })
  await user.tab()
  await replace(1, 'Amount borrowed', '4,000')
  await user.tab()
  expect(editor(1).getByText('Enter a fee of $0 or more, less than the amount borrowed.')).toBeInTheDocument()
  expect(offerResults(1)).toBeNull()

  await replace(1, 'Upfront fee', '500')
  expect(editor(1).queryByText('Enter a fee of $0 or more, less than the amount borrowed.')).toBeNull()
  expect(figure(1, 'Monthly payment (EMI)')).toBe('$355.40')
  expect(figure(1, 'Amount received')).toBe('$3,500.00')
})

test('S-12.2: a new offer starts with the previous amount and puts the cursor in its rate', async () => {
  await enter(1, B1)
  await addOffer()
  expect(box(2, 'Amount borrowed')).toHaveValue('250,000')
  expect(box(2, 'Annual interest rate (%)')).toHaveFocus()
  expect(box(2, 'Annual interest rate (%)')).toHaveValue('')
})

test('S-4.1, S-5.1, S-7.1, S-12.3: three offers are labelled and highlighted, a change re-ranks them, and no fourth can be added', async () => {
  await enter(1, B1)
  await addOffer()
  await enter(2, B2)
  await addOffer()
  await enter(3, B3)
  expect(addButton()).toBeNull()

  expect(within(offerResults(1)!).getByText('Lowest total cost')).toBeInTheDocument()
  expect(within(offerResults(2)!).getByText('Costs $2,846.15 more in total')).toBeInTheDocument()
  expect(within(offerResults(3)!).getByText('Lowest monthly payment')).toBeInTheDocument()
  expect(within(offerResults(3)!).getByText('Costs $30,084.20 more in total')).toBeInTheDocument()
  expect(within(offerResults(1)!).getByText('$53,582.58').tagName).toBe('MARK')
  expect(resultsCard()).toHaveTextContent('Offer 1 has the lowest total cost: $53,582.58.')
  expect(resultsCard()).toHaveTextContent('Offer 3 has the lowest monthly payment: $5,561.11.')

  await replace(2, 'Annual interest rate (%)', '11')
  expect(within(offerResults(2)!).getByText('Lowest total cost')).toBeInTheDocument()
  expect(within(offerResults(1)!).getByText('Costs $1,434.16 more in total')).toBeInTheDocument()
  expect(within(offerResults(3)!).getByText('Costs $31,518.36 more in total')).toBeInTheDocument()
  expect(resultsCard()).toHaveTextContent('Offer 2 has the lowest total cost: $52,148.42.')
})

test('S-12.4: removing an offer renumbers the rest, re-ranks them and moves the cursor to the add button', async () => {
  await enter(1, B1)
  await addOffer()
  await enter(2, B2)
  await addOffer()
  await enter(3, B3)
  await user.click(editor(2).getByRole('button', { name: 'Remove offer 2' }))

  expect(screen.getAllByRole('region', { name: /^Offer \d$/ })).toHaveLength(2)
  expect(box(2, 'Loan length')).toHaveValue('60')
  expect(within(offerResults(2)!).getByText('Costs $30,084.20 more in total')).toBeInTheDocument()
  await waitFor(() => expect(addButton()).toHaveFocus())
})

test('S-12.5: the only offer cannot be removed', async () => {
  await addOffer()
  await user.click(editor(2).getByRole('button', { name: 'Remove offer 2' }))
  expect(editor(1).queryByRole('button', { name: /Remove/ })).toBeNull()
})

test('S-4.3: tied offers are both labelled and the summary says they tie', async () => {
  await enter(1, B1)
  await addOffer()
  await enter(2, B1)
  expect(within(offerResults(1)!).getByText('Lowest total cost (tied)')).toBeInTheDocument()
  expect(within(offerResults(2)!).getByText('Lowest total cost (tied)')).toBeInTheDocument()
  expect(within(offerResults(1)!).queryByText(/more in total/)).toBeNull()
  expect(resultsCard()).toHaveTextContent('Offers 1 and 2 tie for the lowest total cost: $53,582.58.')
})

test('S-4.8, S-7.3: offers for different amounts are not ranked', async () => {
  await enter(1, B1)
  await addOffer()
  await enter(2, { ...B2, amount: '200,000' })
  expect(resultsCard()).toHaveTextContent(
    "These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them.",
  )
  expect(within(offerResults(1)!).queryByText(/^Lowest/)).toBeNull()
  expect(figure(2, 'Monthly payment (EMI)')).toBe('$6,642.86')
})

test('S-8.1: entering and changing offers sends nothing over the network', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
  await enter(1, { ...A, amount: '123,456.78' })
  await replace(1, 'Annual interest rate (%)', '11')
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(xhrSpy).not.toHaveBeenCalled()
})
