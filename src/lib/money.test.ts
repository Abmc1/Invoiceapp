import { describe, it, expect } from "vitest";
import { addMoney, calcInvoiceTotals, calcLineItem, formatMoney, toMoneyString } from "./money";

describe("money", () => {
  it("never uses native floating point for addition", () => {
    // 0.1 + 0.2 famously equals 0.30000000000000004 in JS floats.
    expect(addMoney("0.1", "0.2").toFixed(2)).toBe("0.30");
  });

  it("rounds to 2 decimal places using half-up rounding", () => {
    expect(toMoneyString(1.005)).toBe("1.01");
    expect(toMoneyString("10.126")).toBe("10.13");
  });

  it("calculates a simple line item with no tax", () => {
    const totals = calcLineItem({ quantity: 3, unitPrice: 250 });
    expect(totals.lineSubtotal).toBe("750.00");
    expect(totals.lineTax).toBe("0.00");
    expect(totals.lineTotal).toBe("750.00");
  });

  it("calculates €100 + 23% VAT correctly", () => {
    const totals = calcLineItem({ quantity: 1, unitPrice: 100, taxRate: 23 });
    expect(totals.lineSubtotal).toBe("100.00");
    expect(totals.lineTax).toBe("23.00");
    expect(totals.lineTotal).toBe("123.00");
  });

  it("applies a discount before calculating tax", () => {
    const totals = calcLineItem({ quantity: 2, unitPrice: 100, discount: 20, taxRate: 10 });
    // gross = 200, subtotal = 200 - 20 = 180, tax = 18, total = 198
    expect(totals.lineSubtotal).toBe("180.00");
    expect(totals.lineTax).toBe("18.00");
    expect(totals.lineTotal).toBe("198.00");
  });

  it("handles a zero-value invoice", () => {
    const totals = calcLineItem({ quantity: 0, unitPrice: 0 });
    expect(totals.lineTotal).toBe("0.00");
  });

  it("sums multiple line items into invoice totals", () => {
    const line1 = calcLineItem({ quantity: 3, unitPrice: 250, taxRate: 23 });
    const line2 = calcLineItem({ quantity: 1, unitPrice: 1200, taxRate: 23 });

    const totals = calcInvoiceTotals([
      { quantity: 3, unitPrice: 250, ...line1 },
      { quantity: 1, unitPrice: 1200, ...line2 },
    ]);

    expect(totals.subtotal).toBe("1950.00");
    expect(totals.taxTotal).toBe("448.50");
    expect(totals.total).toBe("2398.50");
  });

  it("formats money for display using the invoice currency", () => {
    expect(formatMoney(1234.5, "EUR")).toMatch(/1,234\.50/);
  });
});
