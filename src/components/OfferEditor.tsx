import { useState, type MouseEvent } from 'react'
import { cn } from 'cn'
import { Select } from 'radix-ui'
import { formatMoney } from '@/domain/format'
import type { LoanResult } from '@/domain/loan'
import { messages } from '@/domain/messages'
import { validateOffer, type Field, type OfferInput, type Validation } from '@/domain/validation'

interface OfferEditorProps {
  number: number
  input: OfferInput
  validation: Validation
  result: LoanResult | null
  isNew: boolean
  focusField?: Field
  onChange: (next: OfferInput) => void
  onRemove?: () => void
}

const FIELDS: Field[] = ['amount', 'rate', 'length', 'fee']
const FIELD_NAMES: Record<Field, string> = {
  amount: 'Amount borrowed',
  rate: 'Interest rate',
  length: 'Loan length',
  fee: 'Upfront fee',
}

/** One offer, written as a sentence with the numbers filled in. */
export function OfferEditor({ number, input, validation, result, isNew, focusField, onChange, onRemove }: OfferEditorProps) {
  const id = (part: string) => `offer-${number}-${part}`
  const [visited, setVisited] = useState<ReadonlySet<Field>>(new Set())
  const [shown, setShown] = useState<ReadonlySet<Field>>(new Set())

  // README rule: when the user leaves a box, every visited box that is invalid shows its
  // message. A showing message then updates as they type and goes once the box is valid.
  function update(next: OfferInput, leaving?: Field) {
    const nextValidation = validateOffer(next)
    if (nextValidation.status === 'empty') {
      setVisited(new Set())
      setShown(new Set())
    } else {
      const invalid = (field: Field) => nextValidation.status === 'invalid' && field in nextValidation.errors
      const nextVisited = leaving ? new Set(visited).add(leaving) : visited
      setVisited(nextVisited)
      setShown(new Set([...(leaving ? nextVisited : shown)].filter(invalid)))
    }
    if (next !== input) onChange(next)
  }

  const errors = validation.status === 'invalid' ? validation.errors : {}
  const message = (field: Field) => (shown.has(field) ? errors[field] : undefined)

  function box(field: Field, label: string, placeholder: string, adornment: { prefix?: string; suffix?: string } = {}) {
    return (
      <InlineBox
        id={id(field)}
        label={label}
        value={input[field]}
        placeholder={placeholder}
        inputMode={field === 'length' ? 'numeric' : 'decimal'}
        error={message(field)}
        autoFocus={focusField === field}
        onChange={(value) => update({ ...input, [field]: value })}
        onBlur={() => update(input, field)}
        {...adornment}
      />
    )
  }

  return (
    <section
      aria-labelledby={id('title')}
      className={cn('min-w-0 rounded-[1.25rem] bg-surface p-5 ring-1 ring-line sm:p-6', isNew && 'rise')}
    >
      <h2 id={id('title')} className="text-[0.9375rem] font-semibold text-muted">
        Offer {number}
      </h2>
      {/* One clause per line, so the offer reads like a short statement. Each box stays with
          the words around it, so narrow screens only break the line at natural points. */}
      <p className="mt-2 text-[1.125rem] leading-[2.6] sm:text-[1.3125rem] sm:leading-[2.5]">
        <span className="block">
          Borrow {box('amount', 'Amount borrowed', '250,000', { prefix: '$' })}{' '}
          <span className="whitespace-nowrap">
            at {box('rate', 'Annual interest rate (%)', '12.5', { suffix: '%' })} a year,
          </span>
        </span>
        <span className="block">
          repaid over{' '}
          <span className="whitespace-nowrap">
            {box('length', 'Loan length', '36')}{' '}
            <InlineSelect
              label="Loan length unit"
              value={input.lengthUnit}
              options={[
                ['months', 'months'],
                ['years', 'years'],
              ]}
              onChange={(lengthUnit) => update({ ...input, lengthUnit }, 'length')}
            />
            ,
          </span>
        </span>
        <span className="block">
          with an upfront fee of{' '}
          {/* The fee and its type stay together, except on the narrowest screens where a long fixed fee needs the room. */}
          <span className="min-[360px]:whitespace-nowrap">
            {box('fee', 'Upfront fee', '0', input.feeType === 'fixed' ? { prefix: '$' } : {})}{' '}
            <span className="whitespace-nowrap">
            <InlineSelect
              label="Upfront fee type"
              value={input.feeType}
              options={[
                ['percent', '% of amount'],
                ['fixed', 'fixed amount'],
              ]}
                onChange={(feeType) => update({ ...input, feeType }, 'fee')}
              />
              .
            </span>
          </span>
        </span>
      </p>

      {/* Always present, so screen readers announce a message as soon as it appears. Each line
          names its box, so two identical messages (say, amount and fee) can be told apart. */}
      <ul aria-live="polite" className={cn('grid gap-1', FIELDS.some((field) => message(field)) && 'mt-2')}>
        {FIELDS.map(
          (field) =>
            message(field) && (
              <li key={field} className="text-[0.9375rem] font-medium text-danger">
                <span className="font-semibold">{FIELD_NAMES[field]}:</span>{' '}
                <span id={`${id(field)}-error`}>{message(field)}</span>
              </li>
            ),
        )}
      </ul>

      <div
        className={cn(
          'mt-4 flex min-h-9 items-center justify-between gap-4 border-t border-line pt-4',
          result && !onRemove && 'lg:hidden',
        )}
      >
        {/* On desktop the results sit alongside, so the quick figure is for mobile only. */}
        {result ? (
          <p className="text-[0.9375rem] lg:hidden">
            <span className="text-muted">Monthly payment </span>
            <span className="font-semibold">{formatMoney(result.emi)}</span>
          </p>
        ) : (
          <p className="text-[0.9375rem] text-muted">
            {[input.amount, input.rate, input.length].some((box) => box.trim() === '')
              ? messages.resultsPlaceholder
              : messages.resultsWhenValid}
          </p>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            onMouseDown={keepFocus}
            aria-label={`Remove offer ${number}`}
            className="ml-auto h-11 shrink-0 rounded-lg px-3 text-[0.9375rem] font-medium text-muted hover:bg-field hover:text-ink"
          >
            Remove
          </button>
        )}
      </div>
    </section>
  )
}

interface InlineBoxProps {
  id: string
  label: string
  value: string
  placeholder: string
  inputMode: 'decimal' | 'numeric'
  prefix?: string
  suffix?: string
  error?: string
  autoFocus: boolean
  onChange: (value: string) => void
  onBlur: () => void
}

/**
 * Pressing a button normally moves focus first, which can reveal a message above the button
 * and push it away before the click lands. Keeping focus where it is makes the click reliable;
 * keyboard use is unaffected.
 */
function keepFocus(event: MouseEvent) {
  event.preventDefault()
}

function InlineBox({ id, label, value, placeholder, inputMode, prefix, suffix, error, autoFocus, onChange, onBlur }: InlineBoxProps) {
  // A label, so tapping anywhere on the box (including the $ or %) focuses the input.
  return (
    <label
      className={cn(
        'inline-flex h-11 cursor-text items-center rounded-xl px-3 align-middle leading-none transition-colors',
        // A box in error keeps its red ring and gains an outline when focused, so focus is always visible.
        error
          ? 'bg-danger-tint ring-2 ring-danger ring-inset focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-danger'
          : 'bg-field ring-1 ring-field-edge ring-inset focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent',
      )}
    >
      {prefix && (
        <span aria-hidden="true" className="mr-0.5 font-semibold text-muted">
          {prefix}
        </span>
      )}
      <input
        id={id}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        // Grows with what is typed, so the sentence reads naturally, up to a cap so a long paste cannot
        // stretch the page; longer text scrolls inside the box.
        style={{ width: `${Math.min(textWidth(value || placeholder), 15)}ch` }}
        className={cn(
          'h-full min-w-[2ch] bg-transparent font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted',
          error ? 'text-danger' : 'text-accent',
        )}
      />
      {suffix && (
        <span aria-hidden="true" className="ml-0.5 font-semibold text-muted">
          {suffix}
        </span>
      )}
    </label>
  )
}

/**
 * A dropdown that matches the boxes in both themes. The native <select> opens the operating
 * system's own menu, which cannot be styled; Radix Select keeps the keyboard and screen reader
 * behaviour of a real listbox while letting the menu follow the design.
 */
function InlineSelect<T extends string>(props: {
  label: string
  value: T
  options: [T, string][]
  onChange: (value: T) => void
}) {
  return (
    <Select.Root value={props.value} onValueChange={(value) => props.onChange(value as T)}>
      <Select.Trigger
        aria-label={props.label}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-field pr-2.5 pl-3 align-middle leading-none font-semibold ring-1 ring-field-edge ring-inset outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-surface data-[state=open]:ring-2 data-[state=open]:ring-accent"
      >
        <Select.Value />
        <Select.Icon className="text-muted">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
            <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl bg-surface p-1 font-sans text-ink shadow-[0_8px_24px_rgb(0_0_0/0.14)] ring-1 ring-line"
        >
          <Select.Viewport>
            {props.options.map(([value, text]) => (
              <Select.Item
                key={value}
                value={value}
                className="relative flex h-11 cursor-default items-center rounded-lg pr-4 pl-9 text-base font-semibold outline-none select-none data-highlighted:bg-field data-[state=checked]:text-accent"
              >
                <Select.ItemIndicator className="absolute left-3">
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
                    <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Select.ItemIndicator>
                <Select.ItemText>{text}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

/** Width in ch units: digits are about 1ch wide, while separators are about half that. */
function textWidth(text: string) {
  return [...text].reduce((width, char) => width + (char === '.' || char === ',' ? 0.45 : 1), 0) + 0.25
}
