import Decimal from "decimal.js";

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/**
 * All monetary math in this application MUST go through Decimal — never
 * native JS floating point (`0.1 + 0.2` etc). Values are persisted as
 * PostgreSQL NUMERIC and therefore arrive/leave as strings.
 */
export type MoneyInput = string | number | Decimal;

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  if (value === "" || value === null || value === undefined) return new Decimal(0);
  return new Decimal(value);
}

/** Round to 2 decimal places using half-up rounding (standard for currency). */
export function roundMoney(value: MoneyInput): Decimal {
  return toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Convert a Decimal to the string representation stored in NUMERIC(x,2) columns. */
export function toMoneyString(value: MoneyInput): string {
  return roundMoney(value).toFixed(2);
}

export function addMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return roundMoney(toDecimal(a).plus(toDecimal(b)));
}

export function subMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return roundMoney(toDecimal(a).minus(toDecimal(b)));
}

export function isZeroMoney(value: MoneyInput): boolean {
  return toDecimal(value).isZero();
}

export function isPositiveMoney(value: MoneyInput): boolean {
  return toDecimal(value).greaterThan(0);
}

export function compareMoney(a: MoneyInput, b: MoneyInput): number {
  return toDecimal(a).comparedTo(toDecimal(b));
}

export interface LineItemInput {
  quantity: MoneyInput;
  unitPrice: MoneyInput;
  discount?: MoneyInput;
  taxRate?: MoneyInput;
}

export interface LineItemTotals {
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
}

/**
 * Computes a single invoice line item's totals.
 *
 * lineSubtotal = (quantity * unitPrice) - discount
 * lineTax      = lineSubtotal * (taxRate / 100)
 * lineTotal    = lineSubtotal + lineTax
 */
export function calcLineItem(input: LineItemInput): LineItemTotals {
  const quantity = toDecimal(input.quantity);
  const unitPrice = toDecimal(input.unitPrice);
  const discount = toDecimal(input.discount ?? 0);
  const taxRate = toDecimal(input.taxRate ?? 0);

  const gross = quantity.times(unitPrice);
  const subtotal = roundMoney(gross.minus(discount));
  const tax = roundMoney(subtotal.times(taxRate).dividedBy(100));
  const total = roundMoney(subtotal.plus(tax));

  return {
    lineSubtotal: subtotal.toFixed(2),
    lineTax: tax.toFixed(2),
    lineTotal: total.toFixed(2),
  };
}

export interface InvoiceTotals {
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
}

/**
 * Sums a list of already-computed line items into invoice-level totals.
 *
 * `subtotal` is the pre-discount gross sum (sum of quantity*unitPrice), not
 * the sum of each line's post-discount `lineSubtotal`. This is deliberate:
 * it keeps the printed invoice arithmetic legible top to bottom —
 * Subtotal - Discount + Tax = Total — matching what appears on the PDF and
 * in the UI. Tax itself is still calculated per-line on the post-discount
 * amount (see `calcLineItem`), so the tax total is always correct even
 * though `subtotal` itself is pre-discount.
 */
export function calcInvoiceTotals(
  lines: Array<{ quantity: MoneyInput; unitPrice: MoneyInput; discount?: MoneyInput } & LineItemTotals>
): InvoiceTotals {
  let subtotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  let taxTotal = new Decimal(0);
  let total = new Decimal(0);

  for (const line of lines) {
    const gross = toDecimal(line.quantity).times(toDecimal(line.unitPrice));
    const discount = toDecimal(line.discount ?? 0);
    subtotal = subtotal.plus(roundMoney(gross));
    discountTotal = discountTotal.plus(roundMoney(discount));
    taxTotal = taxTotal.plus(toDecimal(line.lineTax));
    total = total.plus(toDecimal(line.lineTotal));
  }

  return {
    subtotal: roundMoney(subtotal).toFixed(2),
    discountTotal: roundMoney(discountTotal).toFixed(2),
    taxTotal: roundMoney(taxTotal).toFixed(2),
    total: roundMoney(total).toFixed(2),
  };
}

export function formatMoney(value: MoneyInput, currency = "EUR", locale = "en-IE"): string {
  const amount = toDecimal(value).toNumber();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
