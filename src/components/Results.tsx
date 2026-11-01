import { useEffect, useState } from 'react'
import { cn } from 'cn'
import type { Comparison, Ranking } from '@/domain/comparison'
import { formatMoney } from '@/domain/format'
import type { LoanResult } from '@/domain/loan'
import { messages } from '@/domain/messages'

interface RankedOffer {
  number: number
  result: LoanResult
  ranking: Ranking | null
}

/** The answer: one offer's results in full, or every valid offer side by side on one scale. */
export function Results({ results, comparison }: { results: (LoanResult | null)[]; comparison: Comparison }) {
  const offers = results.flatMap((result, i) => (result ? [{ number: i + 1, result, ranking: comparison.rankings[i] }] : []))
  const answer = verdict(offers)
  const single = offers.length === 1 ? offers[0] : null
  const summary = [
    single &&
      `Offer ${single.number}: monthly payment ${formatMoney(single.result.emi)}, total cost of borrowing ${formatMoney(single.result.totalCost)}.`,
    comparison.message ?? (answer ? `${answer.cheapest} ${answer.cost} ${answer.payment}` : ''),
  ]
    .filter(Boolean)
    .join(' ')
  const announced = useSettled(summary)

  // A size container: the layout inside follows the panel's width, not the window's, so figures
  // never overlap when the panel is narrow (as it is beside the offers on a small desktop).
  return (
    <section aria-label="Results" className="@container overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
      {/* Announces the outcome once typing pauses, rather than every figure on every keystroke. */}
      <p aria-live="polite" className="sr-only">
        {announced}
      </p>
      {offers.length === 0 && <NoResults />}
      {offers.length === 1 && <OneOffer offer={offers[0]} message={comparison.message} />}
      {offers.length > 1 && <ManyOffers offers={offers} message={comparison.message} />}
    </section>
  )
}

function NoResults() {
  return (
    <>
      <div className="bg-brand px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-[0.9375rem] text-white/75">Monthly payment (EMI)</p>
        <p aria-hidden="true" className="mt-2 text-6xl leading-none font-bold text-white/35">
          —
        </p>
        <p className="mt-6 max-w-[34ch] text-[0.9375rem] text-white/75">Your results appear here as you fill in an offer.</p>
      </div>
      <div className="px-6 py-7 sm:px-10">
        <h3 className="font-semibold">What you repay</h3>
        <div aria-hidden="true" className="mt-4 flex h-6 gap-0.5 opacity-(--ghost-opacity)">
          <div className="w-[6%] bg-ghost-fee" />
          <div className="w-[18%] bg-ghost-interest" />
          <div className="flex-1 rounded-r bg-ghost-received" />
        </div>
        <p className="mt-4 max-w-[52ch] text-[0.9375rem] text-muted">
          Everything you repay is the cash you actually receive plus the cost of borrowing: the upfront fee the lender
          keeps and the interest.
        </p>
      </div>
    </>
  )
}

function OneOffer({ offer, message }: { offer: RankedOffer; message: string | null }) {
  const { result } = offer
  return (
    <>
      <section aria-label={`Offer ${offer.number} results`}>
        <div className="bg-brand px-6 py-8 text-white sm:px-10 sm:py-10">
          <p className="text-[0.9375rem] font-medium text-white/75">Offer {offer.number}</p>
          <dl className="mt-5 grid gap-x-10 gap-y-6 @md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @md:items-end">
            <div className="@container">
              <dt className="text-[0.9375rem] text-white/75">Monthly payment (EMI)</dt>
              <dd className="mt-2 font-bold tracking-[-0.03em] [font-stretch:108%]" style={fit(formatMoney(result.emi), 4.5)}>
                {formatMoney(result.emi)}
              </dd>
            </div>
            {result.finalPayment !== result.emi && (
              <div className="-mt-3 flex gap-1.5 text-[0.9375rem] text-white/75">
                <dt>Final payment</dt>
                <dd className="font-semibold text-white">{formatMoney(result.finalPayment)}</dd>
              </div>
            )}
            <div className="@container @md:col-start-2 @md:row-start-1 @md:self-end">
              <dt className="text-[0.9375rem] text-white/75">Total cost of borrowing</dt>
              <dd className="mt-2 font-bold tracking-[-0.02em] [font-stretch:108%]" style={fit(formatMoney(result.totalCost), 2.25)}>
                {formatMoney(result.totalCost)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="px-6 pt-7 sm:px-10">
          <h3 className="font-semibold">What you repay</h3>
          <p className="mt-1 max-w-[60ch] text-[0.9375rem] text-muted">{repaymentSentence(result)}</p>
          <RepaymentBar result={result} scale={result.totalRepaid} className="mt-4" />
          <Breakdown result={result} />
        </div>
      </section>
      <div className="px-6 pt-6 pb-7 sm:px-10">
        {message && <p className="rounded-xl bg-field px-4 py-3 text-[0.9375rem] font-medium">{message}</p>}
      </div>
    </>
  )
}

function ManyOffers({ offers, message }: { offers: RankedOffer[]; message: string | null }) {
  // One scale for every bar, so the cost portions can be compared by length.
  const scale = Math.max(...offers.map((offer) => offer.result.totalRepaid))
  const lowestEmi = Math.min(...offers.map((offer) => offer.result.emi))
  const answer = verdict(offers)
  return (
    <>
      <div className="bg-brand px-6 py-8 text-white sm:px-10 sm:py-10">
        {message && <p className="max-w-[44ch] text-xl leading-snug font-medium">{message}</p>}
        {!message && answer && (
          <>
            <p className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] [font-stretch:104%] sm:text-[2.125rem]">
              <span className="text-win-on-panel">{answer.cheapest}</span> {answer.cost}
            </p>
            <p className="mt-3 text-[1.0625rem] text-white/80">{answer.payment}</p>
          </>
        )}
      </div>
      <div className="divide-y divide-line">
        {offers.map((offer) => (
          <OfferRow
            key={offer.number}
            offer={offer}
            scale={scale}
            lowestPayment={offer.ranking !== null && offer.result.emi === lowestEmi}
          />
        ))}
      </div>
    </>
  )
}

function OfferRow({ offer, scale, lowestPayment }: { offer: RankedOffer; scale: number; lowestPayment: boolean }) {
  const { result, ranking } = offer
  const totalCost = formatMoney(result.totalCost)
  const emi = formatMoney(result.emi)
  return (
    <section aria-label={`Offer ${offer.number} results`} className="px-6 py-7 sm:px-10">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-1 text-lg font-bold">Offer {offer.number}</h3>
        {/* Same badge for both labels, in two colours: one for the cheapest overall, one for the smallest payment. */}
        {ranking?.labels.map((label) => (
          <span
            key={label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] leading-none font-semibold before:size-1.5 before:rounded-full before:bg-current',
              label.startsWith(messages.lowestTotalCost) ? 'bg-win/12 text-win' : 'bg-second/12 text-second',
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <dl className="mt-4 grid gap-x-8 gap-y-4 @md:grid-cols-2">
        <div>
          <dt className="text-[0.9375rem] text-muted">Monthly payment (EMI)</dt>
          <dd className="mt-1 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] [font-stretch:104%]">
            {lowestPayment ? <mark className="win win-payment">{emi}</mark> : emi}
          </dd>
        </div>
        {result.finalPayment !== result.emi && (
          <div className="-mt-3 flex gap-1.5 text-sm text-muted">
            <dt>Final payment</dt>
            <dd className="font-medium text-ink">{formatMoney(result.finalPayment)}</dd>
          </div>
        )}
        <div className="@md:col-start-2 @md:row-start-1">
          <dt className="text-[0.9375rem] text-muted">Total cost of borrowing</dt>
          <dd className="mt-1 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] [font-stretch:104%]">
            {ranking?.extraCost === null ? <mark className="win win-cost">{totalCost}</mark> : totalCost}
          </dd>
        </div>
      </dl>
      {ranking && ranking.extraCost !== null && (
        <p className="mt-2 text-[0.9375rem] font-semibold">{messages.costsMore(formatMoney(ranking.extraCost))}</p>
      )}
      <RepaymentBar result={result} scale={scale} className="mt-5" />
      <Breakdown result={result} compact />
    </section>
  )
}

/** Fee and interest first, so the cost portions line up from the same start across offers. */
function RepaymentBar({ result, scale, className }: { result: LoanResult; scale: number; className?: string }) {
  const parts = [
    { label: 'Upfront fee', cents: result.fee, color: 'bg-fee' },
    { label: 'Total interest', cents: result.totalInterest, color: 'bg-interest' },
    { label: 'Amount received', cents: result.amountReceived, color: 'bg-received' },
  ].filter((part) => part.cents > 0)
  const described = parts.map((part) => `${part.label.toLowerCase()} ${formatMoney(part.cents)}`)
  const madeOf = described.length > 1 ? `${described.slice(0, -1).join(', ')} and ${described.at(-1)}` : described[0]

  return (
    <div
      role="img"
      aria-label={`Total repaid ${formatMoney(result.totalRepaid)}, made up of ${madeOf}`}
      className={cn('bar-part flex h-6 gap-0.5 transition-[width] duration-300', className)}
      style={{ width: `${(result.totalRepaid / scale) * 100}%` }}
    >
      {parts.map((part) => (
        <div
          key={part.label}
          title={`${part.label}: ${formatMoney(part.cents)}`}
          className={cn('bar-part min-w-0.5 transition-[flex-grow] duration-300 last:rounded-r', part.color)}
          style={{ flexGrow: part.cents, flexBasis: 0 }}
        />
      ))}
    </div>
  )
}

/** Doubles as the bar's legend: swatches mark the rows that are segments. */
function Breakdown({ result, compact }: { result: LoanResult; compact?: boolean }) {
  const swatch = 'before:mr-2 before:inline-block before:size-2.5 before:rounded-[3px]'
  const rows = [
    { label: 'Amount borrowed', cents: result.amountBorrowed },
    { label: 'Upfront fee', cents: result.fee, swatch: 'before:bg-fee' },
    { label: 'Amount received', cents: result.amountReceived, swatch: 'before:bg-received', strong: true },
    { label: 'Total interest', cents: result.totalInterest, swatch: 'before:bg-interest' },
    { label: 'Total repaid', cents: result.totalRepaid },
  ]

  if (compact) {
    return (
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[0.9375rem] @xl:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className={cn('text-muted', row.swatch && [swatch, row.swatch])}>{row.label}</dt>
            <dd className={cn('mt-0.5 tabular-nums', row.strong ? 'font-bold' : 'font-medium')}>{formatMoney(row.cents)}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <dl className="mt-6 grid text-[0.9375rem]">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex items-baseline justify-between gap-4 border-t border-line py-2.5',
            row.strong && 'border-ink/30 font-bold',
          )}
        >
          <dt className={cn(!row.strong && 'text-muted', row.swatch && [swatch, row.swatch])}>{row.label}</dt>
          <dd className="tabular-nums">{formatMoney(row.cents)}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * "Offer 1 has the lowest total cost: $53,582.58." and the same for the monthly payment,
 * including ties. Null when the offers are not ranked.
 */
function verdict(offers: RankedOffer[]) {
  const cheapest = offers.filter((offer) => offer.ranking?.extraCost === null)
  if (cheapest.length === 0) return null
  const lowestEmi = Math.min(...offers.map((offer) => offer.result.emi))
  const smallestPayment = offers.filter((offer) => offer.result.emi === lowestEmi)
  const lowest = (group: RankedOffer[], what: string, cents: number) =>
    `${group.length > 1 ? 'tie for' : 'has'} the lowest ${what}: ${formatMoney(cents)}.`
  return {
    cheapest: names(cheapest),
    cost: lowest(cheapest, 'total cost', cheapest[0].result.totalCost),
    payment: `${names(smallestPayment)} ${lowest(smallestPayment, 'monthly payment', lowestEmi)}`,
  }
}

function names(offers: RankedOffer[]) {
  const numbers = offers.map((offer) => offer.number)
  return numbers.length === 1 ? `Offer ${numbers[0]}` : `Offers ${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`
}

/**
 * What the total repaid is made of. The fee is not part of any monthly payment: the lender keeps it
 * when the loan is paid out, so it is repaid within the amount borrowed.
 */
function repaymentSentence(result: LoanResult) {
  const parts = [result.fee > 0 && 'the upfront fee', result.totalInterest > 0 && 'the interest'].filter(Boolean)
  const what = parts.length ? ` (${parts.join(' and ')})` : ''
  return `You repay ${formatMoney(result.totalRepaid)} in total: the ${formatMoney(result.amountReceived)} you receive, plus ${formatMoney(result.totalCost)} cost of borrowing${what}.`
}

/** The value once it has stopped changing for a moment, so typing does not announce every keystroke. */
function useSettled(value: string, delay = 600) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return settled
}

/** Big figures shrink for long amounts so they never overflow their column. */
function fit(text: string, maxRem: number) {
  return { fontSize: `min(${maxRem}rem, calc(100cqi / ${(text.length * 0.62).toFixed(2)}))`, lineHeight: 1 }
}
