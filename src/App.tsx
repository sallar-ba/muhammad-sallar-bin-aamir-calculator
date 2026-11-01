import { useRef, useState } from 'react'
import { OfferEditor } from '@/components/OfferEditor'
import { Results } from '@/components/Results'
import { ThemeToggle } from '@/components/ThemeToggle'
import { compareOffers } from '@/domain/comparison'
import { calculateLoan } from '@/domain/loan'
import { messages } from '@/domain/messages'
import { validateOffer, type OfferInput } from '@/domain/validation'

const MAX_OFFERS = 3
const blank: OfferInput = { amount: '', rate: '', length: '', lengthUnit: 'months', fee: '', feeType: 'percent' }

/** A stable id keeps each offer's own state (such as which messages show) when another is removed. */
interface Offer {
  id: number
  input: OfferInput
}

export default function App() {
  const nextId = useRef(2)
  const addButton = useRef<HTMLButtonElement>(null)
  const [offers, setOffers] = useState<Offer[]>([{ id: 1, input: blank }])
  const [addedId, setAddedId] = useState<number | null>(null)

  // Only the typed text is state; everything else is derived, so it can never go stale.
  const validations = offers.map((offer) => validateOffer(offer.input))
  const results = validations.map((v) => (v.status === 'valid' ? calculateLoan(v.offer) : null))
  const comparison = compareOffers(results)

  function addOffer() {
    // Offers being compared are usually for the same loan, so start from the previous amount if it is valid.
    const previous = offers[offers.length - 1]
    const check = validations[validations.length - 1]
    const amountOk = previous.input.amount.trim() !== '' && !(check.status === 'invalid' && check.errors.amount)
    const id = nextId.current++
    setOffers([...offers, { id, input: { ...blank, amount: amountOk ? previous.input.amount : '' } }])
    setAddedId(id)
  }

  function removeOffer(id: number) {
    setOffers(offers.filter((offer) => offer.id !== id))
    requestAnimationFrame(() => addButton.current?.focus())
  }

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[80rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <p className="flex items-center gap-2.5 font-bold tracking-[-0.01em]">
            <Logo />
            Loan &amp; EMI Calculator
          </p>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[80rem] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-10 lg:pt-14">
        {/* Desktop: the question and offers on the left, the answer on the right from the top.
            Mobile: question, offers, results, then the add button. */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,33rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-12">
          <div className="min-w-0 pb-4 lg:col-start-1 lg:pb-6">
            <h1 className="max-w-[14ch] text-[2.5rem] leading-[0.95] font-extrabold tracking-[-0.035em] [font-stretch:112%] sm:text-[3.25rem]">
              Know what a loan really costs.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[1.0625rem] leading-relaxed text-muted">
              Enter an offer to see your monthly payment, the cash you'll actually receive and the total cost of
              borrowing. Add up to two more to compare them.
            </p>
          </div>
          <div className="grid min-w-0 gap-3 lg:col-start-1">
            {offers.map((offer, i) => (
              <OfferEditor
                key={offer.id}
                number={i + 1}
                input={offer.input}
                validation={validations[i]}
                result={results[i]}
                isNew={offer.id === addedId}
                focusField={offer.id === addedId ? (offer.input.amount ? 'rate' : 'amount') : undefined}
                onChange={(input) => setOffers((current) => current.map((o) => (o.id === offer.id ? { ...o, input } : o)))}
                onRemove={offers.length > 1 ? () => removeOffer(offer.id) : undefined}
              />
            ))}
          </div>
          <div className="min-w-0 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
            <Results results={results} comparison={comparison} />
          </div>
          {offers.length < MAX_OFFERS && (
            <div className="min-w-0 lg:col-start-1 lg:row-start-3">
              <button
                ref={addButton}
                type="button"
                onClick={addOffer}
                // Keep focus put on press, so a message revealed by leaving a box cannot move the button mid-click.
                onMouseDown={(event) => event.preventDefault()}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] border-2 border-accent/30 font-semibold text-accent transition-colors hover:border-accent hover:bg-surface"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add another offer
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-16 border-t border-line">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 lg:px-10">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <Logo className="size-6" />
            Loan &amp; EMI Calculator
          </p>
          <p className="max-w-[60ch] sm:text-right">{messages.disclaimer}</p>
        </div>
      </footer>
    </>
  )
}

/** A tiny repayment bar: fee, interest, then the cash you receive. */
function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--logo)" />
      <rect x="7" y="13" width="3" height="6" fill="#e8a13a" />
      <rect x="11" y="13" width="5" height="6" fill="#d6336c" />
      <rect x="17" y="13" width="8" height="6" rx="1.5" fill="#fff" />
    </svg>
  )
}
