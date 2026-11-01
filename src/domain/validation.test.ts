import { describe, expect, test } from 'vitest'
import { A, B2, offer } from './test-examples'
import { validateOffer, type Field, type OfferInput } from './validation'

const NOT_A_NUMBER = 'Enter a number using only digits, a decimal point and commas.'
const DECIMALS = 'Use no more than 2 decimal places.'
const AMOUNT_RANGE = 'Enter an amount between $1,000 and $100,000,000.'
const RATE_RANGE = 'Enter a rate between 0% and 50%.'
const MONTHS_RANGE = 'Enter a whole number of months between 1 and 120.'
const YEARS_RANGE = 'Enter a whole number of years between 1 and 10.'
const FEE_PERCENT_RANGE = 'Enter a fee between 0% and 10%.'
const FEE_FIXED_RANGE = 'Enter a fee of $0 or more, less than the amount borrowed.'

function errorsOf(input: OfferInput) {
  const validation = validateOffer(input)
  return validation.status === 'invalid' ? validation.errors : {}
}

describe('S-6.1 values that cannot be used show the right message', () => {
  const months = { lengthUnit: 'months' } as const
  const years = { lengthUnit: 'years' } as const
  const percent = { feeType: 'percent' } as const
  const fixed = { feeType: 'fixed' } as const

  test.each<[Field, string, Partial<OfferInput>, string]>([
    ['amount', '', {}, 'Enter the amount borrowed.'],
    ['amount', 'abc', {}, NOT_A_NUMBER],
    ['amount', '1e5', {}, NOT_A_NUMBER],
    ['amount', '1.2.3', {}, NOT_A_NUMBER],
    ['amount', '100000.555', {}, DECIMALS],
    ['amount', '999.99', {}, AMOUNT_RANGE],
    ['amount', '100,000,000.01', {}, AMOUNT_RANGE],
    ['amount', '-5000', {}, AMOUNT_RANGE],
    ['amount', '99999999999999999999', {}, AMOUNT_RANGE],
    ['rate', '', {}, 'Enter the interest rate.'],
    ['rate', '12%', {}, NOT_A_NUMBER],
    ['rate', '12.555', {}, DECIMALS],
    ['rate', '-0.01', {}, RATE_RANGE],
    ['rate', '50.01', {}, RATE_RANGE],
    ['length', '', months, 'Enter the loan length.'],
    ['length', '0', months, MONTHS_RANGE],
    ['length', '121', months, MONTHS_RANGE],
    ['length', '12.5', months, MONTHS_RANGE],
    ['length', 'twelve', months, MONTHS_RANGE],
    ['length', '11', years, YEARS_RANGE],
    ['length', '1.5', years, YEARS_RANGE],
    ['fee', '10.01', percent, FEE_PERCENT_RANGE],
    ['fee', '-1', percent, FEE_PERCENT_RANGE],
    ['fee', '2.555', percent, DECIMALS],
    ['fee', 'two', percent, NOT_A_NUMBER],
    ['fee', '100,000', fixed, FEE_FIXED_RANGE],
    ['fee', '-1', fixed, FEE_FIXED_RANGE],
  ])('%s "%s" %o', (field, value, settings, message) => {
    const validation = validateOffer({ ...A, ...settings, [field]: value })
    expect(validation).toEqual({ status: 'invalid', errors: { [field]: message } })
  })
})

describe('S-6.2 boundary values are accepted', () => {
  test.each<[string, Partial<OfferInput>]>([
    ['amount 1,000', { amount: '1,000' }],
    ['amount 100,000,000', { amount: '100,000,000' }],
    ['rate 0', { rate: '0' }],
    ['rate 50', { rate: '50' }],
    ['1 month', { length: '1' }],
    ['120 months', { length: '120' }],
    ['1 year', { length: '1', lengthUnit: 'years' }],
    ['10 years', { length: '10', lengthUnit: 'years' }],
    ['fee 0%', { fee: '0' }],
    ['fee 10%', { fee: '10' }],
    ['fixed fee 0', { fee: '0', feeType: 'fixed' }],
  ])('%s', (_, change) => {
    expect(validateOffer({ ...A, ...change }).status).toBe('valid')
  })
})

describe('reading numbers', () => {
  test('S-1.8 commas are ignored, and spaces at either end are trimmed', () => {
    for (const amount of ['100000', '100,000', '1,00,000', ' 100000 ']) {
      expect(validateOffer({ ...A, amount })).toMatchObject({ status: 'valid', offer: { amountCents: 10_000_000 } })
    }
  })
  test('a decimal point at either end is accepted, so half-typed numbers like "12." do not flicker an error', () => {
    expect(validateOffer({ ...A, rate: '12.' })).toMatchObject({ status: 'valid', offer: { rateBp: 1200 } })
    expect(validateOffer({ ...A, rate: '.5' })).toMatchObject({ status: 'valid', offer: { rateBp: 50 } })
  })
  test('amounts and rates are read exactly, without floating-point drift', () => {
    expect(validateOffer({ ...A, amount: '100,000.29', rate: '12.57' })).toMatchObject({
      offer: { amountCents: 10_000_029, rateBp: 1257 },
    })
  })
  test('commas are accepted only between digit groups, so a decimal comma is never read as a bigger number (QA-5)', () => {
    const COMMAS = 'Use a point for decimals (4.5) and commas only between thousands (250,000).'
    for (const amount of ['1,000', '250,000', '1,000,000', '10,00,000', '12,34,567.50', '100,000,000.01']) {
      expect(errorsOf({ ...A, amount }).amount, amount).not.toBe(COMMAS)
    }
    expect(errorsOf({ ...A, rate: '4,5' })).toEqual({ rate: COMMAS })
    for (const amount of ['1000,50', '1,,000', ',1000', '1000,', '1,0,0,0', '1.000,50', '12,5000']) {
      expect(errorsOf({ ...A, amount }), amount).toEqual({ amount: COMMAS })
    }
    expect(errorsOf({ ...A, length: '1,2' })).toEqual({ length: MONTHS_RANGE })
  })
  test('a minus sign before the $ still gets the range message', () => {
    expect(errorsOf({ ...A, amount: '-$5000' })).toEqual({ amount: AMOUNT_RANGE })
  })
  test('a leading $ is ignored in the money boxes only', () => {
    expect(validateOffer({ ...A, amount: '$250,000' })).toMatchObject({ offer: { amountCents: 25_000_000 } })
    expect(validateOffer({ ...A, feeType: 'fixed', fee: '$500' })).toMatchObject({ offer: { fee: { cents: 50_000 } } })
    expect(errorsOf({ ...A, rate: '$12' })).toEqual({ rate: NOT_A_NUMBER })
    expect(errorsOf({ ...A, amount: '$' })).toEqual({ amount: NOT_A_NUMBER })
  })
  test('years are converted to months', () => {
    expect(validateOffer({ ...A, length: '5', lengthUnit: 'years' })).toMatchObject({ offer: { months: 60 } })
  })
})

describe('empty, incomplete and cross-field cases', () => {
  test('S-6.6 an offer with every box empty is not entered, so it has no errors', () => {
    expect(validateOffer(offer())).toEqual({ status: 'empty' })
    expect(validateOffer(offer({ amount: '  ', rate: ' ' }))).toEqual({ status: 'empty' })
  })
  test('S-6.7 an offer with only an amount reports the missing rate and length', () => {
    expect(errorsOf(offer({ amount: '100,000' }))).toEqual({
      rate: 'Enter the interest rate.',
      length: 'Enter the loan length.',
    })
  })
  test('a fee on its own counts as entering the offer', () => {
    expect(Object.keys(errorsOf(offer({ fee: '2' })))).toEqual(['amount', 'rate', 'length'])
  })
  test('S-3.5 the fee is optional', () => {
    expect(validateOffer({ ...A, fee: '' })).toMatchObject({ status: 'valid', offer: { fee: { type: 'fixed', cents: 0 } } })
  })
  test('S-3.7 lowering the amount below a fixed fee makes the fee invalid', () => {
    const input = offer({ amount: '4,000', rate: '12', length: '12', feeType: 'fixed', fee: '5,000' })
    expect(errorsOf(input)).toEqual({ fee: FEE_FIXED_RANGE })
  })
  test('S-4.6 a rate of 60 is out of range', () => {
    expect(errorsOf({ ...B2, rate: '60' })).toEqual({ rate: RATE_RANGE })
  })
  test('S-6.5 every invalid box reports its own message', () => {
    expect(errorsOf({ ...A, amount: 'abc', rate: '60' })).toEqual({ amount: NOT_A_NUMBER, rate: RATE_RANGE })
  })
})
