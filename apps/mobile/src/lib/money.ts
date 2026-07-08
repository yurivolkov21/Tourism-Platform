/**
 * Money display for the booking surfaces. Mirrors the web pattern (and the
 * tour card's `price()` helper): `$` for USD, otherwise the currency code as
 * a prefix — never a bare, unlabeled amount.
 */
export function formatMoney(currency: string, amount: number): string {
  return currency === 'USD' ? `$${amount}` : `${currency} ${amount}`;
}
