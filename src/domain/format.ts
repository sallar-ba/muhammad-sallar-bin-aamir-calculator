// Fixed to en-US so amounts read $1,234,567.89 whatever the browser's language (S-1.10).
// The $ is display only: no currency conversion happens anywhere.
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatMoney(cents: number): string {
  return money.format(cents / 100)
}
