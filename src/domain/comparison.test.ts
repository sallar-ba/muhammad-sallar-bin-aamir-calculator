import { describe, expect, test } from 'vitest'
import { compareOffers } from './comparison'
import { formatMoney } from './format'
import { calculateLoan } from './loan'
import { A, B1, B2, B3, EMPTY, offer } from './test-examples'
import { validateOffer, type OfferInput } from './validation'

const ADD_ANOTHER = 'Add another offer to compare.'
const COMPLETE_ANOTHER = 'Complete another offer to compare.'
const DIFFERENT_AMOUNTS =
  "These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them."

/** Compares the offers and returns what each one shows: its labels and "Costs … more in total" amount. */
function compare(...inputs: OfferInput[]) {
  const results = inputs.map((input) => {
    const validation = validateOffer(input)
    return validation.status === 'valid' ? calculateLoan(validation.offer) : null
  })
  const { rankings, message } = compareOffers(results)
  return {
    shown: rankings.map((r) => r && { labels: r.labels, costsMore: r.extraCost === null ? null : formatMoney(r.extraCost) }),
    message,
  }
}

const ranked = (labels: string[], costsMore: string | null = null) => ({ labels, costsMore })

describe('S-4 lowest total cost', () => {
  test('S-4.1 the lowest rate is not the cheapest offer', () => {
    expect(compare(B1, B2, B3)).toEqual({
      shown: [
        ranked(['Lowest total cost']),
        ranked([], '$2,846.15'),
        ranked(['Lowest monthly payment'], '$30,084.20'),
      ],
      message: null,
    })
  })
  test('S-4.2 a "0% interest" offer costs more once its fee is counted', () => {
    const zeroWithFee = offer({ amount: '100,000', rate: '0', length: '12', fee: '5' })
    const eightNoFee = offer({ amount: '100,000', rate: '8', length: '12' })
    expect(compare(zeroWithFee, eightNoFee, EMPTY).shown).toEqual([
      ranked(['Lowest monthly payment'], '$613.89'),
      ranked(['Lowest total cost']),
      null,
    ])
  })
  test('S-4.3 two offers tied for lowest total cost', () => {
    expect(compare(B1, B1, B3).shown).toEqual([
      ranked(['Lowest total cost (tied)']),
      ranked(['Lowest total cost (tied)']),
      ranked(['Lowest monthly payment'], '$30,084.20'),
    ])
  })
  test('S-4.4 all three offers tied on both labels', () => {
    const tied = ranked(['Lowest total cost (tied)', 'Lowest monthly payment (tied)'])
    expect(compare(B1, B1, B1)).toEqual({ shown: [tied, tied, tied], message: null })
  })
  test('S-4.5 a single offer is not ranked, and the next step is to add another', () => {
    expect(compare(B1)).toEqual({ shown: [null], message: ADD_ANOTHER })
  })
  test('S-4.6 an invalid offer does not count towards the comparison', () => {
    expect(compare(B1, { ...B2, rate: '60' })).toEqual({ shown: [null, null], message: COMPLETE_ANOTHER })
  })
  test('S-4.7 no valid offers: no labels and no message', () => {
    expect(compare(EMPTY, EMPTY, EMPTY)).toEqual({ shown: [null, null, null], message: null })
  })
  test('S-4.8 offers for different amounts are not ranked', () => {
    expect(compare(B1, { ...B2, amount: '200,000' }, EMPTY)).toEqual({
      shown: [null, null, null],
      message: DIFFERENT_AMOUNTS,
    })
  })
})

describe('S-5 lowest monthly payment', () => {
  test('S-5.1 the longest loan has the lowest payment but costs the most', () => {
    expect(compare(B1, B2, B3).shown[2]).toEqual(ranked(['Lowest monthly payment'], '$30,084.20'))
  })
  test('S-5.2 one offer can carry both labels', () => {
    const elevenPercent = offer({ amount: '100,000', rate: '11', length: '12', fee: '2' })
    expect(compare(elevenPercent, A, EMPTY).shown).toEqual([
      ranked(['Lowest total cost', 'Lowest monthly payment']),
      ranked([], '$560.55'),
      null,
    ])
  })
  test('S-5.3 different fees tie on monthly payment because the fee does not change the EMI', () => {
    expect(compare(A, { ...A, feeType: 'fixed', fee: '5,000' }, EMPTY).shown).toEqual([
      ranked(['Lowest total cost', 'Lowest monthly payment (tied)']),
      ranked(['Lowest monthly payment (tied)'], '$3,000.00'),
      null,
    ])
  })
})

describe('S-7 changes re-rank the offers', () => {
  test('S-7.1 lowering B2 to 11% makes it the cheapest', () => {
    expect(compare(B1, { ...B2, rate: '11' }, B3).shown).toEqual([
      ranked([], '$1,434.16'),
      ranked(['Lowest total cost']),
      ranked(['Lowest monthly payment'], '$31,518.36'),
    ])
  })
  test('S-7.2 an offer that becomes invalid drops out, and the rest are re-ranked', () => {
    expect(compare({ ...B1, rate: '60' }, B2, B3)).toEqual({
      shown: [null, ranked(['Lowest total cost']), ranked(['Lowest monthly payment'], '$27,238.05')],
      message: null,
    })
  })
  test('S-7.3 changing one amount stops the ranking', () => {
    expect(compare(B1, B2, { ...B3, amount: '200,000' })).toEqual({
      shown: [null, null, null],
      message: DIFFERENT_AMOUNTS,
    })
  })
  test('S-7.4 clearing the second offer asks for it to be completed', () => {
    expect(compare(B1, EMPTY).message).toBe(COMPLETE_ANOTHER)
  })
  test('S-7.5 adding a second offer starts the ranking', () => {
    expect(compare(B1, B2, EMPTY)).toEqual({
      shown: [ranked(['Lowest total cost']), ranked(['Lowest monthly payment'], '$2,846.15'), null],
      message: null,
    })
  })
})
