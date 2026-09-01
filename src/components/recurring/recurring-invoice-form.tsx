"use client";

import { useMemo, useState } from "react";
import { calcInvoiceTotals, calcLineItem, formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

export interface ClientOption {
  id: string;
  label: string;
  defaultPaymentTermsDays: number | null;
  vatExempt: boolean;
}

export interface ServiceOption {
  id: string;
  name: string;
  defaultRate: string;
  rateType: "HOURLY" | "DAILY" | "FIXED" | "CUSTOM";
  defaultTaxRate: string | null;
}

interface Row {
  key: string;
  serviceId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
}

function unitForRateType(rateType: ServiceOption["rateType"]): string {
  if (rateType === "HOURLY") return "hour";
  if (rateType === "DAILY") return "day";
  return "session";
}

function emptyRow(): Row {
  return {
    key: Math.random().toString(36).slice(2),
    serviceId: "",
    description: "",
    quantity: "1",
    unit: "session",
    unitPrice: "0",
    discount: "0",
    taxRate: "0",
  };
}

/**
 * Deliberately a separate component from InvoiceForm rather than a shared
 * abstraction: the two forms share the line-item editor UI but diverge on
 * their top fields (a schedule has no due date, just a frequency + optional
 * end date), and forcing a single parameterised form would make both harder
 * to read for what's a modest amount of duplication.
 */
export function RecurringInvoiceForm({
  action,
  clients,
  services,
  defaultCurrency,
  defaultTaxRate,
  defaultPaymentTermsDays,
  defaultValues,
  submitLabel = "Create Recurring Invoice",
}: {
  action: (formData: FormData) => void | Promise<void>;
  clients: ClientOption[];
  services: ServiceOption[];
  defaultCurrency: string;
  defaultTaxRate: string;
  defaultPaymentTermsDays: number;
  defaultValues?: {
    clientId: string;
    frequency: string;
    startDate: string;
    endDate: string;
    currency: string;
    paymentTermsDays: string;
    paymentTerms: string;
    notes: string;
    vatExempt: boolean;
    vatExemptReason: string;
    items: Array<{
      serviceId: string | null;
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      discount: string;
      taxRate: string;
    }>;
  };
  submitLabel?: string;
}) {
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? clients[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    defaultValues?.items?.length
      ? defaultValues.items.map((i) => ({ key: Math.random().toString(36).slice(2), ...i, serviceId: i.serviceId ?? "" }))
      : [emptyRow()]
  );
  const [vatExempt, setVatExempt] = useState(
    () => defaultValues?.vatExempt ?? clients.find((c) => c.id === (defaultValues?.clientId ?? clients[0]?.id))?.vatExempt ?? false
  );
  const [vatExemptReason, setVatExemptReason] = useState(defaultValues?.vatExemptReason ?? "");

  function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    if (!defaultValues) {
      setVatExempt(clients.find((c) => c.id === newClientId)?.vatExempt ?? false);
    }
  }

  const lineTotals = useMemo(
    () =>
      rows.map((row) =>
        calcLineItem({
          quantity: row.quantity || 0,
          unitPrice: row.unitPrice || 0,
          discount: row.discount || 0,
          taxRate: vatExempt ? 0 : row.taxRate || 0,
        })
      ),
    [rows, vatExempt]
  );

  const invoiceTotals = useMemo(
    () =>
      calcInvoiceTotals(
        rows.map((row, i) => ({
          quantity: row.quantity || 0,
          unitPrice: row.unitPrice || 0,
          discount: row.discount || 0,
          ...lineTotals[i],
        }))
      ),
    [rows, lineTotals]
  );

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleServiceSelect(key: string, serviceId: string) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      updateRow(key, { serviceId: "" });
      return;
    }
    updateRow(key, {
      serviceId,
      description: service.name,
      unitPrice: service.defaultRate,
      unit: unitForRateType(service.rateType),
      taxRate: service.defaultTaxRate ?? defaultTaxRate,
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  const itemsJson = JSON.stringify(
    rows.map((r) => ({
      serviceId: r.serviceId || null,
      description: r.description,
      quantity: r.quantity,
      unit: r.unit,
      unitPrice: r.unitPrice,
      discount: r.discount,
      taxRate: r.taxRate,
    }))
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="vatExempt" value={vatExempt ? "on" : ""} />
      <input type="hidden" name="vatExemptReason" value={vatExemptReason} />

      <Card>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="clientId">Client</Label>
            <Select id="clientId" name="clientId" value={clientId} onChange={(e) => handleClientChange(e.target.value)} required>
              <option value="" disabled>
                Select a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" name="frequency" defaultValue={defaultValues?.frequency ?? "MONTHLY"}>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="startDate">
              {defaultValues ? "Start Date" : "First Invoice Date"}
            </Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={defaultValues?.startDate ?? new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date (optional)</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={defaultValues?.endDate ?? ""} />
          </div>
          <div>
            <Label htmlFor="paymentTermsDays">Payment Terms (days)</Label>
            <Input
              id="paymentTermsDays"
              name="paymentTermsDays"
              type="number"
              min={0}
              defaultValue={defaultValues?.paymentTermsDays ?? String(defaultPaymentTermsDays)}
              required
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" name="currency" defaultValue={defaultValues?.currency ?? defaultCurrency}>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 space-y-2 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={vatExempt}
                onChange={(e) => setVatExempt(e.target.checked)}
                className="size-4"
              />
              VAT Exempt
            </label>
            <p className="text-xs text-muted-foreground">
              Zeroes VAT on every generated invoice, regardless of each line&apos;s tax rate.
            </p>
            {vatExempt ? (
              <Input
                value={vatExemptReason}
                onChange={(e) => setVatExemptReason(e.target.value)}
                placeholder="Reason shown on the invoice (optional), e.g. Reverse charge — Article 44"
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Line Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus /> Add Line
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={row.key} className="rounded-md border border-border p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <Label>Service</Label>
                    <Select value={row.serviceId} onChange={(e) => handleServiceSelect(row.key, e.target.value)}>
                      <option value="">Custom / no service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-4">
                    <Label>Description</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.key, { description: e.target.value })}
                      placeholder="e.g. Monthly Executive Coaching retainer"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-6">
                  <div>
                    <Label>Qty</Label>
                    <Input type="number" step="0.01" value={row.quantity} onChange={(e) => updateRow(row.key, { quantity: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={row.unit} onChange={(e) => updateRow(row.key, { unit: e.target.value })} />
                  </div>
                  <div>
                    <Label>Rate (€)</Label>
                    <Input type="number" step="0.01" value={row.unitPrice} onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Discount (€)</Label>
                    <Input type="number" step="0.01" value={row.discount} onChange={(e) => updateRow(row.key, { discount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tax %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vatExempt ? "0" : row.taxRate}
                      onChange={(e) => updateRow(row.key, { taxRate: e.target.value })}
                      disabled={vatExempt}
                      title={vatExempt ? "Tax is 0% — this schedule is marked VAT Exempt above." : undefined}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label>Line Total</Label>
                    <div className="flex h-10 items-center justify-between gap-2">
                      <span className="font-medium">{formatMoney(lineTotals[i].lineTotal)}</span>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        aria-label="Remove line"
                        className="text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(invoiceTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatMoney(invoiceTotals.discountTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatMoney(invoiceTotals.taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-display text-base">
                <span>Total per invoice</span>
                <span>{formatMoney(invoiceTotals.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              name="paymentTerms"
              placeholder="e.g. Payment due within 14 days"
              defaultValue={defaultValues?.paymentTerms ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
