import type { LoanResult } from './loan'
import { messages } from './messages'

export interface Ranking {
  /** For example "Lowest total cost" or "Lowest monthly payment (tied)". */
  labels: string[]
  /** Cents more than the lowest total cost; null for the lowest offer(s). */
  extraCost: number | null
}

export interface Comparison {
  /** One entry per offer, in order; null when that offer is not ranked. */
  rankings: (Ranking | null)[]
  message: string | null
}

/**
 * Ranks the valid offers (null = not valid). Results are already whole cents, the same
 * figures the user sees, so a label never contradicts the numbers on screen.
 */
export function compareOffers(results: (LoanResult | null)[]): Comparison {
  const valid = results.filter((result) => result !== null)
  const unranked = (message: string | null): Comparison => ({ rankings: results.map(() => null), message })

  if (valid.length === 0) return unranked(null)
  // With other offers already on the page, the next step is to finish one, not add one.
  if (valid.length === 1) return unranked(results.length > 1 ? messages.completeAnotherOffer : messages.addAnotherOffer)
  if (valid.some((result) => result.amountBorrowed !== valid[0].amountBorrowed)) {
    return unranked(messages.differentAmounts)
  }

  const cost = lowest(valid, 'totalCost', messages.lowestTotalCost)
  const emi = lowest(valid, 'emi', messages.lowestMonthlyPayment)

  return {
    rankings: results.map((result) => {
      if (!result) return null
      const labels: string[] = []
      if (result.totalCost === cost.value) labels.push(cost.label)
      if (result.emi === emi.value) labels.push(emi.label)
      return { labels, extraCost: result.totalCost === cost.value ? null : result.totalCost - cost.value }
    }),
    message: null,
  }
}

function lowest(results: LoanResult[], key: 'totalCost' | 'emi', label: string) {
  const value = Math.min(...results.map((result) => result[key]))
  const tied = results.filter((result) => result[key] === value).length > 1
  return { value, label: tied ? `${label} (tied)` : label }
}
