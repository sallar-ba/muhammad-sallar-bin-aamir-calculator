import { formatMoney } from './format'
import { calculateLoan, type LoanResult } from './loan'
import { validateOffer, type OfferInput } from './validation'

// Test fixtures. A and B1–B3 are the "Example offers" in docs/user-stories.md.

export function offer(boxes: Partial<OfferInput> = {}): OfferInput {
  return { amount: '', rate: '', length: '', lengthUnit: 'months', fee: '', feeType: 'percent', ...boxes }
}

export const EMPTY = offer()
export const A = offer({ amount: '100,000', rate: '12', length: '12', fee: '2' })
export const B1 = offer({ amount: '250,000', rate: '12.5', length: '36', fee: '1' })
export const B2 = offer({ amount: '250,000', rate: '12', length: '36', fee: '3' })
export const B3 = offer({ amount: '250,000', rate: '12', length: '60' })

export function calculate(input: OfferInput): LoanResult {
  const validation = validateOffer(input)
  if (validation.status !== 'valid') throw new Error(`Expected a valid offer: ${JSON.stringify(validation)}`)
  return calculateLoan(validation.offer)
}

/** The offer's figures as the user sees them. */
export function shown(input: OfferInput): Record<keyof LoanResult, string> {
  const result = calculate(input)
  return Object.fromEntries(Object.entries(result).map(([key, cents]) => [key, formatMoney(cents)])) as Record<
    keyof LoanResult,
    string
  >
}
