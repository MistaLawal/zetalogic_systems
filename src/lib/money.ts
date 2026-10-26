// All money is stored and calculated as integer kobo (₦1 = 100 kobo) to avoid
// floating-point rounding errors. Convert to naira only for display.
export type Kobo = number;

const ngn = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** formatNaira(25000000) -> "₦250,000.00" */
export function formatNaira(kobo: Kobo): string {
  if (!Number.isInteger(kobo)) throw new Error('Amounts must be integer kobo');
  return ngn.format(kobo / 100).replace('NGN', '₦');
}

/** Parse user-typed naira ("250,000" or "250000.50") into kobo. Returns null if invalid. */
export function parseNairaToKobo(input: string): Kobo | null {
  const clean = input.replace(/[₦,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ''] = clean.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}
