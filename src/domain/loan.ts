import type { ValidOffer } from './validation'

/** An offer's figures, all in whole cents. */
export interface LoanResult {
  amountBorrowed: number
  emi: number
  finalPayment: number
  totalRepaid: number
  totalInterest: number
  fee: number
  amountReceived: number
  totalCost: number
}

/**
 * Repays the loan the way lenders do: the EMI is rounded to the cent, each month's
 * interest on the remaining balance is rounded to the cent, and the final payment
 * clears whatever is left. So every figure is exact to the cent and the totals add up.
 * The fee is taken from the amount received and never changes the EMI.
 */
export function calculateLoan({ amountCents, rateBp, months, fee }: ValidOffer): LoanResult {
  // rateBp / 100 is the annual %, so rateBp / 120,000 is the monthly rate as a fraction.
  // Integer cents × integer bp stays exact; Math.round rounds halves up for positive amounts.
  const interestOn = (balance: number) => Math.round((balance * rateBp) / 120_000)
  const emi = emiCents(amountCents, rateBp, months)

  let balance = amountCents
  for (let month = 1; month < months; month++) balance += interestOn(balance) - emi
  const finalPayment = balance + interestOn(balance)

  const totalRepaid = emi * (months - 1) + finalPayment
  const totalInterest = totalRepaid - amountCents
  const feeCents = fee.type === 'fixed' ? fee.cents : Math.round((amountCents * fee.bp) / 10_000)

  return {
    amountBorrowed: amountCents,
    emi,
    finalPayment,
    totalRepaid,
    totalInterest,
    fee: feeCents,
    amountReceived: amountCents - feeCents,
    totalCost: totalInterest + feeCents,
  }
}

/**
 * The EMI rounded to the nearest cent (halves up), worked out exactly in whole numbers.
 * With r = bp / 120,000 and a = 120,000 + bp, the formula P·r·(1+r)ⁿ / ((1+r)ⁿ − 1) becomes
 * P·bp·aⁿ / (120,000·(aⁿ − 120,000ⁿ)). Floating point can land a hair under a half cent and
 * round the wrong way, as it did for some one-month loans.
 */
function emiCents(amountCents: number, rateBp: number, months: number): number {
  const p = BigInt(amountCents)
  const n = BigInt(months)
  if (rateBp === 0) return Number((2n * p + n) / (2n * n))
  const base = 120_000n
  const bp = BigInt(rateBp)
  const growth = (base + bp) ** n
  const numerator = p * bp * growth
  const denominator = base * (growth - base ** n)
  return Number((2n * numerator + denominator) / (2n * denominator))
}
