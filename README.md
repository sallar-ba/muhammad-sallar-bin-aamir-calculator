# Loan & EMI Calculator

A browser-based calculator for people choosing a personal loan. Start with one offer and see the monthly payment (EMI), the cash you actually receive after the upfront fee, the total cost of borrowing, and what your total repayment is made of. Add up to two more offers to compare them: the lowest total cost and the lowest monthly payment are clearly labelled, and every offer is drawn to the same scale.

> **Status:** the MVP is built. All nine MVP stories are marked Implemented. All 73 automated acceptance checks passed in Google Chrome, Chromium and WebKit (Safari's engine), at desktop and phone sizes, in both themes: see the [acceptance report](docs/acceptance-report.md). All nine MVP stories are verified. S-9 to S-11 are deferred. See [Known limitations](#known-limitations) for what has not been checked.

## Who it is for

People who need to borrow a fixed sum for a planned expense and have two or three personal loan offers in hand, each quoted with a different interest rate, loan length and upfront fee. They can start with whichever offer they have and add the others as they arrive. See [App Roles](docs/app-roles.md).

## Why this calculator

- It is a real decision with real money at stake. Offers are hard to compare: the lowest rate is not always the cheapest loan once an upfront fee is deducted, and a longer loan lowers the monthly payment while raising the total cost.
- A lender's own calculator shows only that lender's product and often leaves the fee out.
- The maths is standard and well defined, so every result can be checked by hand. That matters when an AI tool writes the code.
- A focused version fits the 2 to 4 hour budget.

## Scope

### In the MVP

1. **One offer:** monthly payment (EMI), final payment when rounding makes it differ, total interest and total repaid, from the amount borrowed, annual interest rate and loan length.
2. **Upfront fee:** entered as a percentage or a fixed amount. Shows the fee, the amount received and the total cost of borrowing, and what the total repaid is made of: the cash received plus the cost of borrowing (the upfront fee and the interest).
3. **Comparison:** start with one offer and add up to two more. The lowest total cost and the lowest monthly payment are labelled, each other offer shows how much more it costs, and a summary states the outcome.
4. **Validation:** a clear message for each invalid box, naming the box, and no results for an offer until all its boxes are valid.

### Later

Not implemented user stories S-9 to S-11:

- Flat-rate offers (interest charged on the full amount for the whole loan)
- Month-by-month repayment schedule
- APR (the true annual cost including fees), which would also let offers for different amounts be ranked

### Not planned

| Left out | Reason |
|---|---|
| Live lender rates, applying for a loan | Needs external APIs and cloud services; also regulated |
| Accounts, login, saving to a server | No backend: nothing to install, no personal data to protect |
| Credit score or eligibility checks | Needs credit bureau access and personal data; regulated |
| Recommending which offer to take | That is financial advice. The app shows facts and labels only |
| Prepayment, floating rates, payment holidays, step-up payments | Different maths and a different user (someone already repaying a loan) |
| Other currencies, conversion, taxes on fees | Amounts are shown in dollars as a display choice. Users can include any tax in the fee they enter |
| Mortgages, car loans with balloon payments, buy now pay later | Different mechanics |
| Export, share links | Polish that does not help the comparison |

## Terms used in the app

These labels are used in the app and in every document:

| Term | Meaning |
|---|---|
| Amount borrowed | The loan amount the lender approves. The EMI and interest are based on this. |
| Upfront fee | The processing fee, kept by the lender from the loan before it is paid out |
| Amount received | Amount borrowed minus upfront fee: the cash that actually reaches the borrower |
| Monthly payment (EMI) | The fixed payment due every month, except possibly the last |
| Final payment | The last payment, adjusted by a small amount so the loan ends at exactly zero. Shown only when it differs from the EMI. |
| Total repaid | Every payment added together: EMI × (months − 1) + final payment |
| Total interest | Total repaid minus amount borrowed |
| Total cost of borrowing | Total interest plus upfront fee |

## Assumptions

### Calculation

- Fixed interest rate for the whole loan, charged on the reducing balance, with one payment a month.
- EMI = P × r × (1 + r)^n / ((1 + r)^n − 1), where P is the amount borrowed, r is the annual rate ÷ 12 ÷ 100, and n is the number of months. At 0% interest, EMI = P ÷ n.
- **The upfront fee does not change the EMI.** The fee is kept from the loan when it is paid out, so the EMI is always calculated on the full amount borrowed, not the amount received. If a lender adds its fee to the loan instead, enter the larger amount as the amount borrowed and leave the fee empty.
- **Rounding follows lender practice.** The EMI is rounded to the nearest cent (halves round up), worked out exactly in whole numbers so floating point can never tip a half cent the wrong way. Each month's interest is charged on the remaining balance and rounded to the nearest cent. The final payment is whatever clears the balance exactly, so it can differ slightly from the EMI.
- Every amount shown is exact to the cent, and the figures always add up: total repaid = EMI × (months − 1) + final payment, and total interest = total repaid − amount borrowed. At 0% interest, total interest is exactly $0.00.
- We do not use total repaid = EMI × months. With a rounded EMI, that formula overstates or understates the real total and breaks at the edges. For example, borrowing $100 at 0% over 3 months gives an EMI of $33.33, and $33.33 × 3 = $99.99, which shows −$0.01 interest on an interest-free loan.
- A percentage fee is calculated on the amount borrowed and rounded to the nearest cent.
- Lenders round in different ways (some to whole dollars), so their figures may differ from ours by a small amount. For typical offers (10–36% interest, 12–60 months) the final payment is within $1.00 of the EMI.
- The QA agent (see [Tests](#tests)) cross-checked these rules against its own decimal reference calculator in about 42,000 cases on an earlier build and found one difference: a one-month loan where floating point rounded a half cent the wrong way. The EMI is now worked out exactly in whole numbers and unit tests cover one-month loans, but the 42,000-case cross-check was not re-run after that change.

### Inputs

| Input | Allowed values |
|---|---|
| Amount borrowed | $1,000 to $100,000,000, up to 2 decimal places |
| Annual interest rate | 0% to 50%, up to 2 decimal places |
| Loan length | A whole number: 1 to 120 months, or 1 to 10 years |
| Upfront fee (percentage) | 0% to 10% of the amount borrowed, up to 2 decimal places |
| Upfront fee (fixed amount) | $0 or more and less than the amount borrowed, up to 2 decimal places |

- **Product decision:** the minimum amount borrowed is $1,000. Personal loans smaller than that are rare, and the app is for people comparing real offers.
- **Product decision:** a fixed fee only has to be less than the amount borrowed, while a percentage fee is capped at 10%. Fixed fees are quoted as flat sums rather than as a share of the loan, so they are not held to the percentage cap.
- Plain numbers only: an optional minus sign, digits and one optional decimal point. Commas are allowed only between groups of digits, in Western (`250,000`) or Indian (`2,50,000`) grouping. A comma anywhere else, such as a decimal comma in `4,5`, gets the message "Use a point for decimals (4.5) and commas only between thousands (250,000).", so it can never be misread as a larger number. Spaces at either end are ignored. The money boxes show a `$` beside them, and a `$` typed in front of the number there is ignored too. Anything else, such as letters, `%` or `1e5`, is rejected with a message. A negative number gets the box's range message.
- Amount borrowed, interest rate and loan length are required. The upfront fee is optional: an empty fee counts as $0.
- Loan length starts in months and the upfront fee starts as a percentage. Switching to years, or to a fixed amount, keeps the number typed and changes only what it means.
- Messages appear when the user leaves a box. At that moment, every box in the offer that the user has visited and that is invalid shows its message, so lowering the amount borrowed below a fixed fee reveals the fee message (S-3.7). Changing months/years or %/fixed counts as leaving that box. A message that is showing updates as the user types and disappears as soon as the value is valid. Each message starts with its box's name. An offer's figures are hidden the moment any of its boxes is missing or invalid, even before a message appears.
- Each offer is validated on its own. An offer with every box empty counts as not entered: it shows no messages and no results. An offer with any missing or invalid box shows its messages and no results, and is left out of the comparison; the other offers still work. Under the offer, "Enter the amount borrowed, interest rate and loan length to see results." shows while one of those is empty, and "Results appear once every box has a valid value." once all three are filled in.

### Display

- Every amount is shown in dollars, as `$1,234,567.89`, whatever the browser's language. The `$` is a display choice only: nothing is converted, and the maths is the same in any currency.
- **Light and dark themes.** The first visit follows the system setting, and keeps following it until the user picks a theme with the switch in the header. The choice is remembered in this browser. The theme is applied before the page draws, so it never flashes the wrong colours.
- The two choices in each offer (months/years and % of amount/fixed amount) are dropdowns drawn by the app, so they look the same in both themes and every browser instead of opening the operating system's menu.
- The themes are a display preference rather than one of the needs in [Jobs To Be Done](docs/jobs-to-be-done.md), so they have no user story; the end-to-end tests cover them.

### Offers and comparison

- The page starts with one offer. **Add another offer** adds one, up to three. A new offer starts with the previous offer's amount borrowed when that amount is valid, because offers being compared are usually for the same loan, and the cursor goes to its interest rate.
- Any offer can be removed while there are at least two. Offers are numbered by position, so removing Offer 2 makes Offer 3 the new Offer 2. After a removal the cursor goes to **Add another offer**.
- Only valid offers are compared, and labels and differences update as soon as any offer changes.
- **No valid offers:** no figures and no labels.
- **One valid offer:** its results are shown in full, with no labels. The note says "Add another offer to compare." when it is the only offer, or "Complete another offer to compare." when another offer is on the page but empty or invalid.
- **Different amounts borrowed:** offers for different amounts cannot be ranked fairly. If the valid offers are not all for the same amount borrowed, each offer's results are still shown, but there are no labels or differences, and a message asks for the same amount borrowed in every offer. Loan lengths and fees may differ; showing that trade-off is the point.
- **Labels:** "Lowest total cost" goes to the offer with the lowest total cost of borrowing. "Lowest monthly payment" goes to the offer with the lowest EMI (not the final payment). One offer can carry both. A summary states the outcome, for example "Offer 1 has the lowest total cost: $53,582.58."
- **Total cost is in plain dollars.** It adds up what each loan costs over its whole life and does not adjust for when the money is paid, so a longer loan's later payments are not discounted. That keeps the figure checkable by hand; APR (S-11) is the planned answer for a time-adjusted comparison.
- **Ranking uses the amounts shown**, rounded to the cent, so a label never contradicts the figures on screen.
- **Ties:** every offer that shares the lowest value gets the label with "(tied)" added, for example "Lowest total cost (tied)", and the summary says the offers tie. If all valid offers tie, they all get it.
- **Differences:** each offer without the "Lowest total cost" label shows how much more its total cost of borrowing is than the lowest, for example "Costs $1,250.00 more in total". Offers tied for lowest show no difference.
- **What you repay:** each offer's total repaid is drawn as a bar made of the amount received plus the cost of borrowing (upfront fee and interest), with the cost parts first, and a sentence spells it out, for example "You repay $106,618.53 in total: the $98,000.00 you receive, plus $8,618.53 cost of borrowing (the upfront fee and the interest)." The fee is part of the total repaid because it was kept from the loan at payout and is repaid within the amount borrowed; it is not added to any monthly payment. When comparing, every bar uses the same scale, so the cost parts can be compared by length.

### Privacy and advice

- All calculations run in the browser. The page loads its own files, including its font, but nothing the user enters is ever sent anywhere or stored, and refreshing the page clears it. The only thing saved is the theme choice (`theme` in the browser's local storage).
- The app never recommends an offer. A short note says results are estimates.

### Accessibility

- Everything works with the keyboard alone, in a logical order, with a visible focus outline on every control, including a box that is showing an error. In Safari, as on every site, Tab moves between text boxes and Option+Tab reaches every control, unless full keyboard access is turned on.
- Every box and dropdown has an accessible name. Error messages are tied to their box and sit in a live region, and a results summary is written to a live region once typing pauses.
- Text meets WCAG AA contrast in both themes, including placeholders, and every box has an edge with at least 3:1 contrast.
- On phones, every box, dropdown and button is at least 44 pixels tall. The acceptance tests check that nothing scrolls sideways at 375 pixels with a typical offer (S-1.11) and at 320 pixels with a long fixed fee (S-1.13). 320 pixels is the width a 1280-pixel desktop has at 400% zoom, but zoom itself was not tested.
- Animations are switched off when the system asks for reduced motion. This passed a targeted Chromium desktop check on 1 November 2026.
- The Chromium desktop axe-core scans, contrast, keyboard and reduced-motion checks passed in a targeted pre-submission run on 1 November 2026.

### Platform

- Current versions of Chrome, Edge, Firefox and Safari, on desktop and phone-sized screens.
- Automated checks pass in Google Chrome, Chromium (which Edge is built on) and WebKit (Safari's engine), at desktop and phone sizes. Firefox has not been run, because it would not start in the test environment.

## Prerequisites, install and run

- [Node.js](https://nodejs.org/) 22.12 or later on Node 22, or Node 24 or 26 and later (the range Vitest and Vite support; `package.json` lists it under `engines`). Developed on Node 22.22.1 with npm 10.9.
- No accounts, API keys or cloud services.

```bash
npm install
npm run dev
```

Then open the address Vite prints: http://localhost:5173, or the next free port if 5173 is taken.

To build and serve the production version instead: `npm run build`, then `npm run preview`.

## Tests

```bash
npm test
```

Runs the unit and interface tests once with Vitest, with no browser needed:

- `src/domain/*.test.ts`: the calculation, validation and comparison rules. Tests are named after the acceptance criterion they check, and the expected figures were worked out separately before the code was written.
- `src/App.test.tsx`: the main flows in the interface (typing an offer, when messages appear, adding and removing offers, the comparison), using Testing Library.

`npm run lint` runs oxlint. `npm run build` also type-checks, including the end-to-end tests. A fresh GitHub clone passed installation, all 122 unit/interface tests, the production build, lint and all 438 acceptance checks on 1 November 2026.

### End-to-end tests

```bash
npx playwright install chromium   # once, downloads the browser
npm run test:e2e
```

Playwright builds the app, serves the production build on port 4321 and runs the specs in `e2e/` (everything except `e2e/qa/`) in Chromium twice: at desktop size (1440 × 900) and as a Pixel 7 phone. Besides the acceptance criteria, they cover calculations, adding and removing offers, the comparison, validation, the theme switch, phone layout and privacy. `e2e/screenshots.spec.ts` also saves the main states in both themes at both sizes to `test-results/screens/` for review.

### Acceptance report

```bash
npx playwright install webkit     # once; the run also needs Google Chrome installed
npm run test:acceptance
node e2e/acceptance-report.mjs
```

Runs `e2e/acceptance.spec.ts`, one test per MVP acceptance criterion named by its ID, in installed Google Chrome, Playwright's Chromium and WebKit (Safari's engine) at desktop and phone sizes across both themes, then writes the pass/fail table to [docs/acceptance-report.md](docs/acceptance-report.md). It uses its own build folder and port (4400), so it can run alongside the other suites.

### Independent QA audit (incomplete)

A separate AI agent acting as a QA engineer audited the app without relying on these tests. It worked from the brief and the docs, checked the calculations against its own decimal reference, and wrote its own suite in `e2e/qa/`: validation edge cases, layouts at several widths, accessibility with axe-core, and WebKit runs. It reported 19 findings (QA-1 to QA-19). All were fixed except QA-19, kept as a product decision (the fixed fee may be any amount below the loan), and QA-3, which is the transcripts folder added at submission.

The full QA retest remains incomplete. A targeted Chromium desktop run on 1 November 2026 covered accessibility and the 1120-pixel layout scenarios: 35 passed, 1 skipped and 2 failed. Both failures reproduce clipping and overlap when comparing the largest allowed values, in the light and dark themes. To run the full suite:

```bash
npx playwright install webkit firefox   # once
npm run test:qa
```

Firefox would not launch in the environment this was built in.

## Known limitations

- **Firefox, the Safari app and real phones** have not been tested. WebKit and Playwright's device emulation stand in for Safari and phones.
- **Keyboard in WebKit:** S-1.12 passes there with Option+Tab, because Safari's Tab key skips buttons and menus unless full keyboard access is turned on.
- **Comparison layout at 1120 pixels:** the targeted QA run confirmed that some totals clip or overlap when comparing the largest allowed values in either theme. This remains unresolved.
- **The 42,000-case calculation cross-check** was done by the QA agent on an earlier build and not repeated.
- **Bundle size:** the production JavaScript is about 116 KB gzipped, up from about 85 KB, because of the Radix dropdowns.
- **Total cost is not time-adjusted**, and offers for different amounts are not ranked against each other (see [Offers and comparison](#offers-and-comparison)).

## How the code is organised

- `src/domain/`: plain TypeScript with no React. Validation turns typed text into whole cents and basis points, the loan calculation uses whole cents throughout (and whole-number arithmetic for the EMI), and the comparison ranks the results. All user-facing messages are in `messages.ts`.
- `src/components/OfferEditor.tsx`: one offer, written as a sentence with the boxes filled in, the rule for when messages appear, and the dropdowns (Radix Select).
- `src/components/Results.tsx`: the results panel, the total-repaid bar and the comparison.
- `src/components/ThemeToggle.tsx`: the light/dark switch. A small script in `index.html` applies the theme before the first paint.
- `src/App.tsx`: the page. Only the typed text is state; validation, results and the comparison are worked out from it on every change.
- `e2e/`: the Playwright end-to-end tests, the acceptance tests (`acceptance.spec.ts`, `acceptance.config.ts`, `acceptance-report.mjs`) and the QA agent's suite (`e2e/qa/`).

## AI tool and model

Claude Code with Claude Opus 5.5 (`claude-opus-5-5`), including the separate QA agent. Session transcripts, exported with `/export`, are in [transcripts/](transcripts/).

## Code changed by hand

None. All code, tests and documents were written by Claude Code from the prompts in the transcripts.

## Product documents

- [App Roles](docs/app-roles.md)
- [Jobs To Be Done](docs/jobs-to-be-done.md)
- [User Stories with Acceptance Criteria](docs/user-stories.md)
- [Acceptance report](docs/acceptance-report.md)
