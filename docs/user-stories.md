# User Stories with Acceptance Criteria

Every story serves a job in [Jobs To Be Done](jobs-to-be-done.md), and every job belongs to the [Personal Loan Shopper](app-roles.md). The calculation, input and comparison rules behind these criteria are in the [README](../README.md#assumptions).

**Status:** Implemented describes the behavior built in the app; verification is recorded separately below. Each criterion has its own Playwright test, named by its ID. The [acceptance report](acceptance-report.md) records all 73 automated checks passing in Google Chrome, Chromium and WebKit (Safari's engine), at desktop and phone sizes, in both themes.

- **Verified:** every criterion passed as written in all six setups.
- **Deferred:** planned for later, not built (S-9 to S-11).

## Summary

| Story | Capability | Serves | Scope | Status | Verification |
|---|---|---|---|---|---|
| S-1 | Monthly payment for an offer | J-3 | MVP | Implemented | Verified |
| S-2 | Totals that add up | J-5 | MVP | Implemented | Verified |
| S-3 | Upfront fee and amount received | J-2 | MVP | Implemented | Verified |
| S-4 | Lowest total cost across offers | J-1 | MVP | Implemented | Verified |
| S-5 | Lowest monthly payment against total cost | J-4 | MVP | Implemented | Verified |
| S-6 | Clear messages for input that can't be used | J-5 | MVP | Implemented | Verified |
| S-7 | Figures update as offers change | J-1 | MVP | Implemented | Verified |
| S-8 | Loan details stay on the device | J-6 | MVP | Implemented | Verified (S-8.1 by recording every request the page makes, in place of reading the Network tab) |
| S-12 | Start with one offer, add and remove others | J-1 | MVP | Implemented | Verified |
| S-9 | Flat-rate offers | J-1 | Later | Not implemented | Deferred |
| S-10 | Month-by-month repayment schedule | J-5 | Later | Not implemented | Deferred |
| S-11 | APR including the fee | J-1 | Later | Not implemented | Deferred |

## How to read the criteria

- The page opens with one offer, **Offer 1**. **Add another offer** adds Offer 2 and then Offer 3; **Remove** takes an offer away again.
- Each offer is a sentence with four boxes and two choices: "Borrow **$[Amount borrowed]** at **[Annual interest rate (%)]%** a year, repaid over **[Loan length]** **[months/years]**, with an upfront fee of **[Upfront fee]** **[% of amount / fixed amount]**." Loan length starts on months and the fee starts on % of amount.
- "Enter" means typing into the boxes. There is no Calculate button; figures appear and update as you type. "Choose" means opening one of the two dropdowns (months/years, % of amount/fixed amount) and picking an option.
- "Leave the box" means moving focus out of it, for example by pressing Tab.
- Figures appear in the **Results** panel, beside the offers on desktop and below them on a phone. With one valid offer, that offer's results fill the panel. With more, each valid offer has its own section, under a summary of the outcome. "Offer 1 shows …" in a results criterion means Offer 1's results.
- Every amount is shown in dollars with comma thousands separators and two decimal places, for example `$8,884.88`. The money boxes show a `$` beside them; the `$` does not need to be typed.

### Example offers

Criteria refer to these by name. "Enter example A in Offer 1" means filling Offer 1's boxes with these values.

| Example | Amount borrowed | Annual interest rate | Loan length | Upfront fee |
|---|---|---|---|---|
| A | $100,000 | 12% | 12 months | 2 (% of amount) |
| B1 | $250,000 | 12.5% | 36 months | 1 (% of amount) |
| B2 | $250,000 | 12% | 36 months | 3 (% of amount) |
| B3 | $250,000 | 12% | 60 months | empty |

Their expected results:

| Example | Monthly payment (EMI) | Final payment | Total repaid | Total interest | Upfront fee | Amount received | Total cost of borrowing |
|---|---|---|---|---|---|---|---|
| A | $8,884.88 | $8,884.85 | $106,618.53 | $6,618.53 | $2,000.00 | $98,000.00 | $8,618.53 |
| B1 | $8,363.41 | $8,363.23 | $301,082.58 | $51,082.58 | $2,500.00 | $247,500.00 | $53,582.58 |
| B2 | $8,303.58 | $8,303.43 | $298,928.73 | $48,928.73 | $7,500.00 | $242,500.00 | $56,428.73 |
| B3 | $5,561.11 | $5,561.29 | $333,666.78 | $83,666.78 | $0.00 | $250,000.00 | $83,666.78 |

B2 has the lowest interest rate but is not the cheapest. B3 has the lowest monthly payment but costs the most.

### Messages

| Where | When | Message |
|---|---|---|
| Amount borrowed | Left empty while another box in the offer has a value | Enter the amount borrowed. |
| Annual interest rate | Left empty while another box in the offer has a value | Enter the interest rate. |
| Loan length | Left empty while another box in the offer has a value | Enter the loan length. |
| Amount borrowed, interest rate or upfront fee | Not a number | Enter a number using only digits, a decimal point and commas. |
| Amount borrowed, interest rate or upfront fee | More than 2 decimal places | Use no more than 2 decimal places. |
| Amount borrowed, interest rate or upfront fee | A comma that does not separate thousands, such as the decimal comma in `4,5` | Use a point for decimals (4.5) and commas only between thousands (250,000). |
| Amount borrowed | Outside $1,000 to $100,000,000 | Enter an amount between $1,000 and $100,000,000. |
| Annual interest rate | Outside 0 to 50 | Enter a rate between 0% and 50%. |
| Loan length in months | Not a whole number from 1 to 120 | Enter a whole number of months between 1 and 120. |
| Loan length in years | Not a whole number from 1 to 10 | Enter a whole number of years between 1 and 10. |
| Upfront fee as % | Outside 0 to 10 | Enter a fee between 0% and 10%. |
| Upfront fee as fixed amount | Negative, or not less than the amount borrowed | Enter a fee of $0 or more, less than the amount borrowed. |
| Under an offer | The amount borrowed, interest rate or loan length is empty | Enter the amount borrowed, interest rate and loan length to see results. |
| Under an offer | All three are filled in, but a box is invalid | Results appear once every box has a valid value. |
| Results panel | Exactly one valid offer, and no other offer on the page | Add another offer to compare. |
| Results panel | Exactly one valid offer, and another offer that is empty or invalid | Complete another offer to compare. |
| Results panel | Valid offers have different amounts borrowed | These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them. |
| Page | Always | Estimates only. Your lender's figures may differ slightly because of rounding. |

A box's message appears under its offer's sentence, after the box's name (for example "Interest rate: Enter a rate between 0% and 50%."), and the box itself turns red. Messages are in a live region, so screen readers announce them as they appear.

---

## S-1 (serves J-3, Implemented)

"As a Personal Loan Shopper, I want to see the monthly payment for a loan offer, so that I can check whether it fits my budget."

- **S-1.1** Given the page has just opened, when I enter example A in Offer 1, then Offer 1 shows Monthly payment (EMI) $8,884.88.
- **S-1.2** Given Offer 1 has $100,000 and 12% and no loan length, when I type 1 in Loan length and choose years, then Offer 1 shows Monthly payment (EMI) $8,884.88, the same as 12 months.
- **S-1.3** Given Offer 1 has $100,000, 12% and Loan length 5 in months, when I switch Loan length to years, then the box still shows 5 and Offer 1 shows Monthly payment (EMI) $2,224.44 (60 months).
- **S-1.4** Given the page has just opened, when I enter $1,000, 0% and 3 months in Offer 1, then Offer 1 shows Monthly payment (EMI) $333.33.
- **S-1.5** Given the page has just opened, when I enter $1,000, 12% and 1 month (the shortest loan) in Offer 1, then Offer 1 shows Monthly payment (EMI) $1,010.00.
- **S-1.6** Given the page has just opened, when I enter $100,000,000, 50% and 120 months (the largest values allowed) in Offer 1, then Offer 1 shows Monthly payment (EMI) $4,197,969.76 in full, not abbreviated or in scientific notation, and it fits on a phone screen.
- **S-1.7** Given the page has just opened, when I enter $100,000, 0.01% and 12 months in Offer 1, then Offer 1 shows Monthly payment (EMI) $8,333.78.
- **S-1.8** Given the page has just opened, when I type the amount as `1,00,000`, ` 100000 ` (with spaces at each end) or `$100,000` and enter 12% and 12 months, then Offer 1 shows Monthly payment (EMI) $8,884.88.
- **S-1.9** Given Offer 1 has $100,000 and 12% but no loan length, then no figures are shown, and Offer 1 shows "Enter the amount borrowed, interest rate and loan length to see results."
- **S-1.10** Given the browser's language is set to German (which normally writes 8.884,88), when I enter example A in Offer 1, then Offer 1 still shows Monthly payment (EMI) $8,884.88.
- **S-1.11** Given a screen 375 pixels wide, when I enter example A in Offer 1, then every box and figure can be read without scrolling sideways.
- **S-1.12** Given I use only the keyboard, when I press Tab repeatedly from the top of the page, then I reach the theme switch, then every box and choice in Offer 1 and its Remove button (when shown), then those of each added offer in order, then **Add another offer**.
- **S-1.13** Given a screen 320 pixels wide, when I enter $250,000, 12.5%, 36 months and a fixed fee of 12,500.50, then nothing on the page scrolls sideways.
- **S-1.14** Given a screen reader is running, when I enter example A in Offer 1 and stop typing, then the Results panel announces "Offer 1: monthly payment $8,884.88, total cost of borrowing $8,618.53. Add another offer to compare."

## S-2 (serves J-5, Implemented)

"As a Personal Loan Shopper, I want to see the total interest, the total I will repay and any adjusted final payment, with figures that add up, so that I can check a lender's numbers against my own."

- **S-2.1** Given the page has just opened, when I enter example A in Offer 1, then Offer 1 shows Final payment $8,884.85, Total repaid $106,618.53 and Total interest $6,618.53.
- **S-2.2** Given any valid offer, then Monthly payment (EMI) × (months − 1) + Final payment equals Total repaid, and Total repaid − Amount borrowed equals Total interest, to the cent. For example A: $8,884.88 × 11 + $8,884.85 = $106,618.53, and $106,618.53 − $100,000.00 = $6,618.53.
- **S-2.3** Given the page has just opened, when I enter $1,000, 0% and 3 months in Offer 1, then Offer 1 shows Final payment $333.34, Total repaid $1,000.00 and Total interest $0.00.
- **S-2.4** Given the page has just opened, when I enter $1,000, 0% and 120 months in Offer 1 (the smallest amount over the longest loan), then Offer 1 shows Monthly payment (EMI) $8.33, Final payment $8.73, Total repaid $1,000.00 and Total interest $0.00.
- **S-2.5** Given the page has just opened, when I enter $1,000, 12% and 1 month in Offer 1, then Offer 1 shows no Final payment line, because it would equal the EMI, along with Total repaid $1,010.00 and Total interest $10.00.
- **S-2.6** Given the page has just opened, when I enter $100,000,000, 50% and 120 months in Offer 1, then Offer 1 shows Final payment $4,197,974.28, Total repaid $503,756,375.72 and Total interest $403,756,375.72.
- **S-2.7** Given the page has just opened, when I enter $100,000, 0.01% and 12 months in Offer 1, then Offer 1 shows Total interest $5.43.
- **S-2.8** Given the page is open, then it shows "Estimates only. Your lender's figures may differ slightly because of rounding."
- **S-2.9** Given the page has just opened, when I enter $1,000, 0.99% and 1 month in Offer 1 (one month's interest is exactly $0.825, a half cent), then Offer 1 shows Monthly payment (EMI) $1,000.83, no Final payment line, Total repaid $1,000.83 and Total interest $0.83.

## S-3 (serves J-2, Implemented)

"As a Personal Loan Shopper, I want to include the lender's upfront fee and see the amount I will actually receive, kept separate from the amount I borrow, so that I can be sure the cash covers my expense."

- **S-3.1** Given the page has just opened, when I enter example A in Offer 1, then Offer 1 shows Amount borrowed $100,000.00, Upfront fee $2,000.00, Amount received $98,000.00 and Total cost of borrowing $8,618.53.
- **S-3.2** Given Offer 1 holds example A, when I change Upfront fee to 10, then Monthly payment (EMI) stays $8,884.88, Total repaid stays $106,618.53 and Total interest stays $6,618.53, while Upfront fee shows $10,000.00, Amount received $90,000.00 and Total cost of borrowing $16,618.53.
- **S-3.3** Given Offer 1 holds example A, when I choose fixed amount and type 5,000 as the Upfront fee, then Offer 1 shows Upfront fee $5,000.00, Amount received $95,000.00, Total cost of borrowing $11,618.53 and Monthly payment (EMI) $8,884.88.
- **S-3.4** Given Offer 1 holds example A, when I choose fixed amount without changing the box, then the box still shows 2 and Offer 1 shows Upfront fee $2.00, Amount received $99,998.00 and Total cost of borrowing $6,620.53.
- **S-3.5** Given Offer 1 holds example A, when I clear the Upfront fee box, then no message appears and Offer 1 shows Upfront fee $0.00, Amount received $100,000.00 and Total cost of borrowing $6,618.53.
- **S-3.6** Given Offer 1 holds example A, when I choose fixed amount and type 99,999.99 (just under the amount borrowed), then Offer 1 shows Amount received $0.01 and Total cost of borrowing $106,618.52.
- **S-3.7** Given Offer 1 has $100,000, 12%, 12 months and a fixed fee of $5,000, when I change Amount borrowed to 4,000 and leave the box, then Offer 1 shows "Enter a fee of $0 or more, less than the amount borrowed." with the Upfront fee box in red, and no figures are shown.
- **S-3.8** Given the situation at the end of S-3.7, when I change Upfront fee to 500, then the message disappears and Offer 1 shows Monthly payment (EMI) $355.40, Upfront fee $500.00, Amount received $3,500.00 and Total cost of borrowing $764.74.
- **S-3.9** Given Offer 1 holds example A, then "What you repay" says "You repay $106,618.53 in total: the $98,000.00 you receive, plus $8,618.53 cost of borrowing (the upfront fee and the interest)." It shows the total repaid as a bar split into the upfront fee, the total interest and the amount received, and each of those is listed with its amount beside a matching colour key. The fee is part of the total repaid because it is kept from the loan at payout and repaid within the amount borrowed; it is not added to any monthly payment.

## S-4 (serves J-1, Implemented)

"As a Personal Loan Shopper, I want to see which of my offers costs the least in total and how much more each of the others costs, so that I can pick the cheapest offer rather than the one with the lowest rate."

- **S-4.1** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, then:
  - Offer 1 shows "Lowest total cost", and its total cost of borrowing is highlighted.
  - Offer 2 shows "Costs $2,846.15 more in total", even though it has the lowest rate.
  - Offer 3 shows "Costs $30,084.20 more in total". It also shows "Lowest monthly payment" (see S-5).
  - The summary says "Offer 1 has the lowest total cost: $53,582.58."
- **S-4.2** Given Offer 1 has $100,000, 0%, 12 months and an upfront fee of 5 (% of amount), and Offer 2 has $100,000, 8%, 12 months and no fee, then:
  - Offer 2 shows "Lowest total cost" (Total cost of borrowing $4,386.11).
  - Offer 1 shows "Costs $613.89 more in total" (Total cost of borrowing $5,000.00). The "0% interest" offer costs more once its fee is counted.
- **S-4.3** Given B1 has been entered as both Offer 1 and Offer 2, and B3 as Offer 3, then:
  - Offers 1 and 2 both show "Lowest total cost (tied)" and no "Costs … more" line.
  - Offer 3 shows "Costs $30,084.20 more in total".
  - The summary says "Offers 1 and 2 tie for the lowest total cost: $53,582.58."
- **S-4.4** Given B1 has been entered as all three offers, then every offer shows "Lowest total cost (tied)" and "Lowest monthly payment (tied)", and none shows a "Costs … more" line.
- **S-4.5** Given B1 is in Offer 1 and no other offer has been added, then Offer 1's results are shown with no labels, and the Results panel shows "Add another offer to compare."
- **S-4.6** Given B1 is in Offer 1, and Offer 2 holds B2 except for an interest rate of 60, then:
  - Offer 2 shows "Enter a rate between 0% and 50%." and has no results.
  - Offer 1's results are shown with no labels.
  - The Results panel shows "Complete another offer to compare."
- **S-4.7** Given the page has just opened, then there is one empty offer showing "Enter the amount borrowed, interest rate and loan length to see results.", and no figures, labels or comparison message are shown.
- **S-4.8** Given B1 is in Offer 1, and Offer 2 holds B2 with Amount borrowed changed to $200,000, then:
  - Both offers' results are shown, with no labels or "Costs … more" lines.
  - The Results panel shows "These offers are for different amounts, so they can't be ranked. Use the same amount borrowed in every offer to compare them."
- **S-4.9** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, then every offer's total-repaid bar is drawn to the same scale, with the upfront fee and interest first, so Offer 3's longer cost portion is visible at a glance.
- **S-4.10** Given a window 1024 pixels wide, when I enter three offers of $100,000,000 (50%, 120 months, 10% fee; 49.99%, 120 months, 9.99% fee; 1%, 1 month), then every figure in the Results panel is fully visible and no two figures overlap.

## S-5 (serves J-4, Implemented)

"As a Personal Loan Shopper, I want to see which offer has the lowest monthly payment alongside what each offer costs in total, so that I can judge whether a smaller payment is worth the extra cost."

- **S-5.1** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, then:
  - Offer 3 shows "Lowest monthly payment" (Monthly payment (EMI) $5,561.11) and "Costs $30,084.20 more in total".
  - Offer 1 shows "Lowest total cost".
  - The summary says "Offer 3 has the lowest monthly payment: $5,561.11."
- **S-5.2** Given Offer 1 has $100,000, 11%, 12 months and 2 (% of amount), and Offer 2 holds example A, then:
  - Offer 1 shows both "Lowest total cost" and "Lowest monthly payment" (Monthly payment (EMI) $8,838.17).
  - Offer 2 shows "Costs $560.55 more in total".
- **S-5.3** Given Offer 1 holds example A, and Offer 2 holds example A with a fixed fee of $5,000, then:
  - Both offers show "Lowest monthly payment (tied)", because the fee does not change the EMI.
  - Offer 1 shows "Lowest total cost".
  - Offer 2 shows "Costs $3,000.00 more in total".

## S-6 (serves J-5, Implemented)

"As a Personal Loan Shopper, I want a clear message whenever something I type can't be used, and no figures until I fix it, so that I never rely on a wrong number."

- **S-6.1** Given Offer 1 holds example A, when I replace one box with a value from the table below and leave the box, then that box turns red, its message appears under the offer after the box's name, and no figures are shown for Offer 1.

  | Box | Value typed | Message |
  |---|---|---|
  | Amount borrowed | (empty) | Enter the amount borrowed. |
  | Amount borrowed | `abc` | Enter a number using only digits, a decimal point and commas. |
  | Amount borrowed | `1e5` | Enter a number using only digits, a decimal point and commas. |
  | Amount borrowed | `1.2.3` | Enter a number using only digits, a decimal point and commas. |
  | Amount borrowed | `100000.555` | Use no more than 2 decimal places. |
  | Amount borrowed | `1000,50` | Use a point for decimals (4.5) and commas only between thousands (250,000). |
  | Amount borrowed | `1,,000` | Use a point for decimals (4.5) and commas only between thousands (250,000). |
  | Amount borrowed | `999.99` | Enter an amount between $1,000 and $100,000,000. |
  | Amount borrowed | `100,000,000.01` | Enter an amount between $1,000 and $100,000,000. |
  | Amount borrowed | `-5000` | Enter an amount between $1,000 and $100,000,000. |
  | Amount borrowed | `99999999999999999999` | Enter an amount between $1,000 and $100,000,000. |
  | Annual interest rate | (empty) | Enter the interest rate. |
  | Annual interest rate | `12%` | Enter a number using only digits, a decimal point and commas. |
  | Annual interest rate | `12.555` | Use no more than 2 decimal places. |
  | Annual interest rate | `4,5` | Use a point for decimals (4.5) and commas only between thousands (250,000). |
  | Annual interest rate | `-0.01` | Enter a rate between 0% and 50%. |
  | Annual interest rate | `50.01` | Enter a rate between 0% and 50%. |
  | Loan length (months) | (empty) | Enter the loan length. |
  | Loan length (months) | `0` | Enter a whole number of months between 1 and 120. |
  | Loan length (months) | `121` | Enter a whole number of months between 1 and 120. |
  | Loan length (months) | `12.5` | Enter a whole number of months between 1 and 120. |
  | Loan length (months) | `twelve` | Enter a whole number of months between 1 and 120. |
  | Loan length (years) | `11` | Enter a whole number of years between 1 and 10. |
  | Loan length (years) | `1.5` | Enter a whole number of years between 1 and 10. |
  | Upfront fee (% of amount) | `10.01` | Enter a fee between 0% and 10%. |
  | Upfront fee (% of amount) | `-1` | Enter a fee between 0% and 10%. |
  | Upfront fee (% of amount) | `2.555` | Use no more than 2 decimal places. |
  | Upfront fee (% of amount) | `two` | Enter a number using only digits, a decimal point and commas. |
  | Upfront fee (fixed amount) | `100,000` | Enter a fee of $0 or more, less than the amount borrowed. |
  | Upfront fee (fixed amount) | `-1` | Enter a fee of $0 or more, less than the amount borrowed. |

- **S-6.2** Given Offer 1 holds example A, when I replace one box with any of these boundary values, then no message appears and Offer 1's figures are shown:
  - Amount borrowed: 1,000 or 100,000,000
  - Annual interest rate: 0 or 50
  - Loan length: 1 or 120 (months), or 1 or 10 (years)
  - Upfront fee: 0 or 10 (% of amount), or 0 (fixed amount)
- **S-6.3** Given Offer 1 holds example A and its figures are shown, when I change Amount borrowed to 999 without leaving the box, then the figures disappear at once. When I then leave the box, "Enter an amount between $1,000 and $100,000,000." appears.
- **S-6.4** Given Offer 1 shows "Enter an amount between $1,000 and $100,000,000.", when I change Amount borrowed back to 100,000, then the message disappears as I type, without leaving the box, and Offer 1 shows Monthly payment (EMI) $8,884.88 again.
- **S-6.5** Given Offer 1 holds example A, when I change Amount borrowed to `abc` and Annual interest rate to 60, leaving each box, then:
  - Both messages appear.
  - When I correct only Amount borrowed to 100,000, its message disappears, the rate message stays and there are still no figures.
  - When I then correct the rate to 12, the message disappears and the figures return.
- **S-6.6** Given Offer 1 is empty and I add Offer 2, when I Tab through all of Offer 2's boxes without typing, then Offer 2 shows no messages.
- **S-6.7** Given Offer 1 is empty, when I type 100,000 in Amount borrowed and then Tab into and out of Annual interest rate without typing, then Offer 1 shows "Enter the interest rate." and no message for the loan length.
- **S-6.8** Given an offer shows one or more messages, when I clear every box in it, then its messages disappear and it is treated as not entered.
- **S-6.9** Given B1 is in Offer 1 and Offer 2 has an invalid interest rate, then Offer 1 still shows all its figures.
- **S-6.10** Given any value from the S-6.1 table is typed into any offer, then the page keeps working: no blank screen, no browser error dialog, and the other offers still calculate.
- **S-6.11** Given Offer 1 has $100,000, 12 months and an interest rate of 60, then instead of figures Offer 1 shows "Results appear once every box has a valid value."
- **S-6.12** Given a box shows its message, when I Tab back into it, then the box shows a visible focus outline as well as its red ring.
- **S-6.13** Given I paste a 60-digit number into Amount borrowed and leave the box, then its message appears and the page does not become wider than the screen.
- **S-6.14** Given a message appears under an offer, then it is inside a polite live region, so a screen reader announces it without the user returning to the box.

## S-7 (serves J-1, Implemented)

"As a Personal Loan Shopper, I want every figure and label to update as soon as I change any offer, so that I can try different numbers without starting again."

- **S-7.1** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, when I change Offer 2's interest rate from 12 to 11, then, without pressing anything:
  - Offer 2 shows Monthly payment (EMI) $8,184.68, Total cost of borrowing $52,148.42 and "Lowest total cost".
  - Offer 1 shows "Costs $1,434.16 more in total".
  - Offer 3 shows "Costs $31,518.36 more in total" and still shows "Lowest monthly payment".
  - The summary says "Offer 2 has the lowest total cost: $52,148.42."
- **S-7.2** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, when I change Offer 1's interest rate to 60, then Offer 1 drops out of the comparison:
  - Offer 2 shows "Lowest total cost".
  - Offer 3 shows "Lowest monthly payment" and "Costs $27,238.05 more in total".
  - When I change Offer 1's rate back to 12.5, the labels from S-4.1 return.
- **S-7.3** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, when I change Offer 3's Amount borrowed to 200,000, then all labels and "Costs … more" lines disappear and the different-amounts message appears. When I change it back to 250,000, the message disappears and the labels from S-4.1 return.
- **S-7.4** Given B1 is in Offer 1 and B2 in Offer 2, when I clear every box in Offer 2, then the labels disappear and the Results panel shows "Complete another offer to compare."
- **S-7.5** Given B1 is in Offer 1 and no other offer has been added, when I add Offer 2 and enter B2, then:
  - "Add another offer to compare." disappears.
  - Offer 1 shows "Lowest total cost".
  - Offer 2 shows "Lowest monthly payment" and "Costs $2,846.15 more in total".

## S-8 (serves J-6, Implemented)

"As a Personal Loan Shopper, I want the loan details I type to stay on my device, so that no lender or broker gets hold of them."

- **S-8.1** Given the browser's developer tools are open on the Network tab, when I enter 123,456.78 as Amount borrowed, 12% and 12 months in Offer 1 and then change them, then no request sent by the page contains 123456.78 or 123,456.78 (or any other value I typed) in its address, headers or body. The page may load its own files; it never sends what I enter.
- **S-8.2** Given the page has finished loading, when I turn off the internet connection and enter example A in Offer 1, then Offer 1 still shows Monthly payment (EMI) $8,884.88.
- **S-8.3** Given I have entered offers, when I reload the page, then there is one empty offer again and no figures are shown.
- **S-8.4** Given I use the app, then it never asks for a name, phone number, email address or sign-in.

## S-12 (serves J-1, Implemented)

"As a Personal Loan Shopper, I want to start with the one offer I have and add or remove others as they arrive, so that I only fill in what I actually have."

- **S-12.1** Given the page has just opened, then there is one offer, Offer 1, with no Remove button, and an **Add another offer** button below it.
- **S-12.2** Given Offer 1 has Amount borrowed $250,000, when I select Add another offer, then Offer 2 appears with Amount borrowed already set to 250,000, its other boxes empty, and the cursor in its interest rate. If Offer 1's amount is empty or invalid, the new offer's amount is empty and the cursor is in its amount.
- **S-12.3** Given there are three offers, then Add another offer is no longer shown.
- **S-12.4** Given B1, B2 and B3 have been entered as Offers 1, 2 and 3, when I select Remove on Offer 2, then:
  - Two offers remain, renumbered by position, so B3 becomes Offer 2.
  - The comparison updates: Offer 2 shows "Costs $30,084.20 more in total".
  - The cursor moves to Add another offer.
- **S-12.5** Given there is only one offer, then it has no Remove button.

---

## Later

These stories are planned for after the MVP. They are deferred: not built and not tested.

## S-9 (serves J-1, Not implemented)

"As a Personal Loan Shopper, I want to enter an offer quoted as a flat rate, so that I can compare it fairly with offers quoted on a reducing balance."

- **S-9.1** Given Offer 1 has $100,000, 10% (flat rate), 12 months and no fee, then Offer 1 shows Monthly payment (EMI) $9,166.67, Final payment $9,166.63 and Total interest $10,000.00.
- **S-9.2** Given that flat-rate offer is in Offer 1, and Offer 2 has $100,000, 12% (reducing balance), 12 months and no fee, then Offer 2 shows "Lowest total cost" and Offer 1 shows "Costs $3,381.47 more in total", even though its quoted rate is lower.
- **S-9.3** Given Offer 1 is set to flat rate, when I enter 50.01 as the rate and leave the box, then I see "Enter a rate between 0% and 50%." and no figures.

## S-10 (serves J-5, Not implemented)

"As a Personal Loan Shopper, I want to see each month's payment split into interest and principal, so that I can check it against the repayment schedule in my loan agreement."

- **S-10.1** Given Offer 1 holds example A, when I open Offer 1's schedule, then it has 12 rows.
- **S-10.2** Given Offer 1's schedule for example A is open, then:
  - Row 1 shows payment $8,884.88, interest $1,000.00, principal $7,884.88 and balance $92,115.12.
  - Row 2 shows payment $8,884.88, interest $921.15, principal $7,963.73 and balance $84,151.39.
- **S-10.3** Given Offer 1's schedule for example A is open, then row 12 shows payment $8,884.85, interest $87.97, principal $8,796.88 and balance $0.00.
- **S-10.4** Given any valid offer's schedule is open, then the interest column adds up to that offer's Total interest, and the balance in the last row is $0.00.
- **S-10.5** Given Offer 1 has an invalid box, then no schedule can be opened for Offer 1.

## S-11 (serves J-1, Not implemented)

"As a Personal Loan Shopper, I want to see each offer's annual percentage rate (APR) with the upfront fee included, so that I can compare offers with different fees, or for different amounts, using one number."

APR here means 12 times the monthly rate at which the offer's payments exactly repay the amount received.

- **S-11.1** Given Offer 1 holds example A with the upfront fee cleared, then Offer 1 shows APR 12.00%.
- **S-11.2** Given Offer 1 holds example A (2% fee), then Offer 1 shows APR 15.85%.
- **S-11.3** Given two valid offers for different amounts borrowed, then each shows its APR and the offer with the lower APR shows "Lowest APR", with ties marked "(tied)" as for the other labels.
