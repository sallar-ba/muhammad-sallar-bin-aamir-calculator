import { describe, expect, test } from 'vitest'
import { calculateLoan } from './loan'
import { A, B1, B2, B3, calculate, offer, shown } from './test-examples'
import { validateOffer } from './validation'

describe('example offers match the expected results table', () => {
  test.each([
    ['A', A, ['$8,884.88', '$8,884.85', '$106,618.53', '$6,618.53', '$2,000.00', '$98,000.00', '$8,618.53']],
    ['B1', B1, ['$8,363.41', '$8,363.23', '$301,082.58', '$51,082.58', '$2,500.00', '$247,500.00', '$53,582.58']],
    ['B2', B2, ['$8,303.58', '$8,303.43', '$298,928.73', '$48,928.73', '$7,500.00', '$242,500.00', '$56,428.73']],
    ['B3', B3, ['$5,561.11', '$5,561.29', '$333,666.78', '$83,666.78', '$0.00', '$250,000.00', '$83,666.78']],
  ])('%s', (_, input, [emi, finalPayment, totalRepaid, totalInterest, fee, amountReceived, totalCost]) => {
    expect(shown(input)).toMatchObject({ emi, finalPayment, totalRepaid, totalInterest, fee, amountReceived, totalCost })
  })
})

describe('S-1 monthly payment', () => {
  test('S-1.1 example A', () => {
    expect(shown(A).emi).toBe('$8,884.88')
  })
  test('S-1.2 one year gives the same EMI as 12 months', () => {
    expect(shown(offer({ amount: '100,000', rate: '12', length: '1', lengthUnit: 'years' })).emi).toBe('$8,884.88')
  })
  test('S-1.3 a length of 5 in years means 60 months', () => {
    expect(shown(offer({ amount: '100,000', rate: '12', length: '5', lengthUnit: 'years' })).emi).toBe('$2,224.44')
  })
  test('S-1.4 zero interest', () => {
    expect(shown(offer({ amount: '1,000', rate: '0', length: '3' })).emi).toBe('$333.33')
  })
  test('S-1.5 the shortest loan', () => {
    expect(shown(offer({ amount: '1,000', rate: '12', length: '1' })).emi).toBe('$1,010.00')
  })
  test('S-1.6 the largest values allowed', () => {
    expect(shown(offer({ amount: '100,000,000', rate: '50', length: '120' })).emi).toBe('$4,197,969.76')
  })
  test('S-1.7 a very small rate', () => {
    expect(shown(offer({ amount: '100,000', rate: '0.01', length: '12' })).emi).toBe('$8,333.78')
  })
  test.each(['1,00,000', ' 100000 '])('S-1.8 amount typed as "%s"', (amount) => {
    expect(shown(offer({ amount, rate: '12', length: '12' })).emi).toBe('$8,884.88')
  })
})

describe('S-2 totals that add up', () => {
  test('S-2.1 example A', () => {
    expect(shown(A)).toMatchObject({ finalPayment: '$8,884.85', totalRepaid: '$106,618.53', totalInterest: '$6,618.53' })
  })
  test.each([
    ['A', A],
    ['B1', B1],
    ['B2', B2],
    ['B3', B3],
  ])('S-2.2 %s: EMI × (months − 1) + final = total repaid, and total repaid − borrowed = interest', (_, input) => {
    const validation = validateOffer(input)
    if (validation.status !== 'valid') throw new Error('invalid example')
    const { months } = validation.offer
    const r = calculateLoan(validation.offer)
    expect(r.emi * (months - 1) + r.finalPayment).toBe(r.totalRepaid)
    expect(r.totalRepaid - r.amountBorrowed).toBe(r.totalInterest)
  })
  test('S-2.3 zero interest: the final payment absorbs the rounding and interest is exactly 0.00', () => {
    expect(shown(offer({ amount: '1,000', rate: '0', length: '3' }))).toMatchObject({
      finalPayment: '$333.34',
      totalRepaid: '$1,000.00',
      totalInterest: '$0.00',
    })
  })
  test('S-2.4 smallest amount over the longest loan at zero interest', () => {
    expect(shown(offer({ amount: '1,000', rate: '0', length: '120' }))).toMatchObject({
      emi: '$8.33',
      finalPayment: '$8.73',
      totalRepaid: '$1,000.00',
      totalInterest: '$0.00',
    })
  })
  test('S-2.5 a one-month loan has a final payment equal to the EMI', () => {
    const r = calculate(offer({ amount: '1,000', rate: '12', length: '1' }))
    expect(r.finalPayment).toBe(r.emi)
    expect(shown(offer({ amount: '1,000', rate: '12', length: '1' }))).toMatchObject({
      totalRepaid: '$1,010.00',
      totalInterest: '$10.00',
    })
  })
  test('S-2.6 the largest values allowed', () => {
    expect(shown(offer({ amount: '100,000,000', rate: '50', length: '120' }))).toMatchObject({
      finalPayment: '$4,197,974.28',
      totalRepaid: '$503,756,375.72',
      totalInterest: '$403,756,375.72',
    })
  })
  test('S-2.7 a very small rate', () => {
    expect(shown(offer({ amount: '100,000', rate: '0.01', length: '12' })).totalInterest).toBe('$5.43')
  })
})

describe('S-3 upfront fee and amount received', () => {
  test('S-3.1 a percentage fee is deducted from the amount received', () => {
    expect(shown(A)).toMatchObject({
      amountBorrowed: '$100,000.00',
      fee: '$2,000.00',
      amountReceived: '$98,000.00',
      totalCost: '$8,618.53',
    })
  })
  test('S-3.2 the fee does not change the EMI or the totals repaid', () => {
    expect(shown({ ...A, fee: '10' })).toMatchObject({
      emi: '$8,884.88',
      totalRepaid: '$106,618.53',
      totalInterest: '$6,618.53',
      fee: '$10,000.00',
      amountReceived: '$90,000.00',
      totalCost: '$16,618.53',
    })
  })
  test('S-3.3 a fixed fee', () => {
    expect(shown({ ...A, feeType: 'fixed', fee: '5,000' })).toMatchObject({
      emi: '$8,884.88',
      fee: '$5,000.00',
      amountReceived: '$95,000.00',
      totalCost: '$11,618.53',
    })
  })
  test('S-3.4 switching to a fixed fee keeps the number typed', () => {
    expect(shown({ ...A, feeType: 'fixed' })).toMatchObject({
      fee: '$2.00',
      amountReceived: '$99,998.00',
      totalCost: '$6,620.53',
    })
  })
  test('S-3.5 an empty fee counts as 0', () => {
    expect(shown({ ...A, fee: '' })).toMatchObject({
      fee: '$0.00',
      amountReceived: '$100,000.00',
      totalCost: '$6,618.53',
    })
  })
  test('S-3.6 a fixed fee just under the amount borrowed', () => {
    expect(shown({ ...A, feeType: 'fixed', fee: '99,999.99' })).toMatchObject({
      amountReceived: '$0.01',
      totalCost: '$106,618.52',
    })
  })
  test('S-3.8 a fixed fee on a smaller loan', () => {
    expect(shown(offer({ amount: '4,000', rate: '12', length: '12', feeType: 'fixed', fee: '500' }))).toMatchObject({
      emi: '$355.40',
      fee: '$500.00',
      amountReceived: '$3,500.00',
      totalCost: '$764.74',
    })
  })
})

test('S-7.1 B2 at 11%', () => {
  expect(shown({ ...B2, rate: '11' })).toMatchObject({ emi: '$8,184.68', totalCost: '$52,148.42' })
})

describe('one-month loans (QA-4)', () => {
  test('$1,000 at 0.99% for 1 month is one payment of $1,000.83 (exact value 1,000.825 rounds up)', () => {
    expect(shown(offer({ amount: '1,000', rate: '0.99', length: '1' }))).toMatchObject({
      emi: '$1,000.83',
      finalPayment: '$1,000.83',
      totalInterest: '$0.83',
    })
  })

  test('for every rate, the single payment is the amount plus one month of interest, and there is no separate final payment', () => {
    const failures: string[] = []
    for (const amountCents of [100_000, 100_023, 12_345_678, 10_000_000_000]) {
      for (let rateBp = 0; rateBp <= 5000; rateBp++) {
        const r = calculateLoan({ amountCents, rateBp, months: 1, fee: { type: 'fixed', cents: 0 } })
        // Independent of the EMI formula: one month's interest, rounded half up.
        const expected = amountCents + Math.floor((2 * amountCents * rateBp + 120_000) / 240_000)
        if (r.emi !== expected || r.finalPayment !== r.emi) failures.push(`${amountCents}c at ${rateBp}bp: ${r.emi}/${r.finalPayment}, expected ${expected}`)
      }
    }
    expect(failures.slice(0, 5)).toEqual([])
  })
})

describe('rounding properties across the input limits', () => {
  const noFee = { type: 'fixed', cents: 0 } as const

  test('near the 1,000 minimum the final payment is always positive, and 0% always gives exactly 0.00 interest', () => {
    const failures: string[] = []
    for (const amountCents of [100_000, 100_023, 100_050, 100_099, 150_000]) {
      for (let rateBp = 0; rateBp <= 5000; rateBp += 25) {
        for (let months = 1; months <= 120; months++) {
          const r = calculateLoan({ amountCents, rateBp, months, fee: noFee })
          if (r.finalPayment <= 0) failures.push(`final ${r.finalPayment}: ${amountCents}c ${rateBp}bp ${months}m`)
          if (rateBp === 0 && r.totalInterest !== 0) failures.push(`0% interest ${r.totalInterest}: ${amountCents}c ${months}m`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  test('README claim: for typical offers (10–36%, 12–60 months) the final payment is within 1.00 of the EMI', () => {
    let worst = 0
    for (const amountCents of [1_000_000, 5_000_055, 10_722_233, 12_345_678, 100_000_000]) {
      for (let rateBp = 1000; rateBp <= 3600; rateBp += 25) {
        for (let months = 12; months <= 60; months++) {
          const r = calculateLoan({ amountCents, rateBp, months, fee: noFee })
          worst = Math.max(worst, Math.abs(r.finalPayment - r.emi))
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(100)
  })
})
