import { messages } from './messages'

export type Field = 'amount' | 'rate' | 'length' | 'fee'

/** What the user typed into one offer. */
export interface OfferInput {
  amount: string
  rate: string
  length: string
  lengthUnit: 'months' | 'years'
  fee: string
  feeType: 'percent' | 'fixed'
}

/** A checked offer in whole units, so the calculation never sees a decimal string. */
export interface ValidOffer {
  amountCents: number
  /** Annual interest rate in hundredths of a percent: 12.5% is 1250. */
  rateBp: number
  months: number
  fee: { type: 'percent'; bp: number } | { type: 'fixed'; cents: number }
}

export type Validation =
  | { status: 'empty' }
  | { status: 'invalid'; errors: Partial<Record<Field, string>> }
  | { status: 'valid'; offer: ValidOffer }

type Read<T> = { value: T } | { error: string }

// Limits in hundredths (cents, or hundredths of a percent), as in the README.
const MIN_AMOUNT = 1_000_00
const MAX_AMOUNT = 100_000_000_00
const MAX_RATE = 50_00
const MAX_FEE_PERCENT = 10_00

export function validateOffer(input: OfferInput): Validation {
  const boxes = [input.amount, input.rate, input.length, input.fee]
  if (boxes.every((box) => box.trim() === '')) return { status: 'empty' }

  const amount = required(input.amount, messages.amountRequired, () =>
    readNumber(withoutDollar(input.amount), MIN_AMOUNT, MAX_AMOUNT, messages.amountRange),
  )
  const rate = required(input.rate, messages.rateRequired, () => readNumber(input.rate, 0, MAX_RATE, messages.rateRange))
  const length = required(input.length, messages.lengthRequired, () => readLength(input.length, input.lengthUnit))
  const fee = readFee(input, 'value' in amount ? amount.value : undefined)

  const errors: Partial<Record<Field, string>> = {}
  if ('error' in amount) errors.amount = amount.error
  if ('error' in rate) errors.rate = rate.error
  if ('error' in length) errors.length = length.error
  if ('error' in fee) errors.fee = fee.error
  if (!('value' in amount && 'value' in rate && 'value' in length && 'value' in fee)) {
    return { status: 'invalid', errors }
  }
  return {
    status: 'valid',
    offer: { amountCents: amount.value, rateBp: rate.value, months: length.value, fee: fee.value },
  }
}

function required(text: string, missing: string, read: () => Read<number>): Read<number> {
  return text.trim() === '' ? { error: missing } : read()
}

/** Money boxes show a $ beside them, so a $ typed (or pasted) in front of the number is ignored. */
function withoutDollar(text: string): string {
  return text.trim().replace(/^(-?)\$/, '$1')
}

// Commas may only separate digit groups: 1,000,000 or the Indian 10,00,000.
const GROUPED = /^(\d{1,3}(,\d{3})+|\d{1,2}(,\d{2})*,\d{3})$/

/**
 * Reads typed text as a whole number of hundredths, straight from the digits so no
 * floating point is involved. Surrounding spaces are ignored and grouping commas are
 * allowed; a comma anywhere else (such as a decimal comma in 4,5) is an error, so it can
 * never be misread as a much larger number. A minus sign is allowed so negative numbers
 * get the range message rather than a format message.
 */
function parseHundredths(text: string): Read<number> {
  const cleaned = text.trim()
  const match = /^(-?)([\d,]*)(?:\.([\d,]*))?$/.exec(cleaned)
  if (!match || !/\d/.test(cleaned)) return { error: messages.notANumber }
  const [, sign, whole, fraction = ''] = match
  if (fraction.includes(',') || (whole.includes(',') && !GROUPED.test(whole))) return { error: messages.commas }
  if (fraction.length > 2) return { error: messages.tooManyDecimals }
  const value = Number(whole.replaceAll(',', '') || '0') * 100 + Number(fraction.padEnd(2, '0'))
  return { value: sign ? -value : value }
}

function readNumber(text: string, min: number, max: number, rangeError: string): Read<number> {
  const parsed = parseHundredths(text)
  if ('error' in parsed) return parsed
  return parsed.value >= min && parsed.value <= max ? parsed : { error: rangeError }
}

/** Returns the length in months. Any problem gets the unit's own message. */
function readLength(text: string, unit: OfferInput['lengthUnit']): Read<number> {
  const [max, rangeError] = unit === 'years' ? [10, messages.yearsRange] : [120, messages.monthsRange]
  const parsed = readNumber(text, 1_00, max * 100, rangeError)
  if ('error' in parsed || parsed.value % 100 !== 0) return { error: rangeError }
  const count = parsed.value / 100
  return { value: unit === 'years' ? count * 12 : count }
}

/** The fee is optional. A fixed fee is checked against the amount only once the amount itself is valid. */
function readFee(input: OfferInput, amountCents: number | undefined): Read<ValidOffer['fee']> {
  if (input.fee.trim() === '') return { value: { type: 'fixed', cents: 0 } }
  if (input.feeType === 'percent') {
    const percent = readNumber(input.fee, 0, MAX_FEE_PERCENT, messages.feePercentRange)
    return 'error' in percent ? percent : { value: { type: 'percent', bp: percent.value } }
  }
  const fixed = parseHundredths(withoutDollar(input.fee))
  if ('error' in fixed) return fixed
  if (fixed.value < 0 || (amountCents !== undefined && fixed.value >= amountCents)) {
    return { error: messages.feeFixedRange }
  }
  return { value: { type: 'fixed', cents: fixed.value } }
}
