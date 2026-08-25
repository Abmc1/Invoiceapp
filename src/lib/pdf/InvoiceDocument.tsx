import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/money";
import { clientDisplayName } from "@/lib/services/clients";
import type { CompanySettings, Client, Invoice, InvoiceItem, Payment } from "@/db/schema";

const BRAND_RED = "#C62435";
const INK = "#1D1D1B";
const MUTED = "#6b6b68";
const BORDER = "#e2e2e0";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  companyBlock: { maxWidth: 260 },
  companyName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: BRAND_RED,
    marginBottom: 6,
  },
  smallText: { fontSize: 9, color: MUTED, lineHeight: 1.5 },
  invoiceMetaBlock: { alignItems: "flex-end" },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 8,
    letterSpacing: 1,
  },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: { fontSize: 9, color: MUTED, width: 80, textAlign: "right", marginRight: 8 },
  metaValue: { fontSize: 9, color: INK, textAlign: "right", width: 100 },
  billToBlock: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  billToLabel: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  billToName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  table: { marginTop: 8 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: INK,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colRate: { flex: 1.3, textAlign: "right" },
  colTax: { flex: 1, textAlign: "right" },
  colAmount: { flex: 1.3, textAlign: "right" },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 220, justifyContent: "space-between", marginBottom: 4 },
  totalsLabel: { fontSize: 9.5, color: MUTED },
  totalsValue: { fontSize: 9.5, color: INK },
  grandTotalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: INK,
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  amountDueRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#faf1f2",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  amountDueLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_RED },
  amountDueValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_RED },
  section: { marginTop: 24 },
  sectionLabel: {
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionText: { fontSize: 9.5, lineHeight: 1.5, color: INK },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-end",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: MUTED,
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" });
}

function statusColor(status: string): string {
  switch (status) {
    case "PAID":
      return "#1f8a4c";
    case "OVERDUE":
      return BRAND_RED;
    case "PARTIALLY_PAID":
      return "#b5760a";
    case "VOID":
    case "CANCELLED":
      return "#8a8a86";
    default:
      return "#3a5f8a";
  }
}

export interface InvoiceDocumentProps {
  settings: CompanySettings;
  client: Client;
  invoice: Invoice;
  items: InvoiceItem[];
  payments: Payment[];
  displayStatus: string;
}

export function InvoiceDocument({ settings, client, invoice, items, payments, displayStatus }: InvoiceDocumentProps) {
  const addressLines = [settings.addressLine1, settings.addressLine2, [settings.city, settings.county].filter(Boolean).join(", "), settings.postcode, settings.country].filter(Boolean);

  const clientAddressLines = [
    client.billingAddressLine1,
    client.billingAddressLine2,
    [client.billingCity, client.billingCounty].filter(Boolean).join(", "),
    client.billingPostcode,
    client.billingCountry,
  ].filter(Boolean);

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={settings.companyName}
      subject={`Invoice ${invoice.invoiceNumber} for ${clientDisplayName(client)}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{settings.tradingName || settings.companyName}</Text>
            {addressLines.map((line, i) => (
              <Text key={i} style={styles.smallText}>{line}</Text>
            ))}
            {settings.vatRegistered && settings.vatNumber ? (
              <Text style={styles.smallText}>VAT No: {settings.vatNumber}</Text>
            ) : null}
            {settings.email ? <Text style={styles.smallText}>{settings.email}</Text> : null}
            {settings.phone ? <Text style={styles.smallText}>{settings.phone}</Text> : null}
            {settings.website ? <Text style={styles.smallText}>{settings.website}</Text> : null}
          </View>

          <View style={styles.invoiceMetaBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <Text style={[styles.statusBadge, { backgroundColor: statusColor(displayStatus) }]}>
              {displayStatus.replace("_", " ")}
            </Text>
          </View>
        </View>

        <View style={styles.billToBlock}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>{clientDisplayName(client)}</Text>
          {clientAddressLines.map((line, i) => (
            <Text key={i} style={styles.smallText}>{line}</Text>
          ))}
          {client.email ? <Text style={styles.smallText}>{client.email}</Text> : null}
          {client.taxNumber ? <Text style={styles.smallText}>Tax/VAT No: {client.taxNumber}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.colTax]}>Tax</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{`${Number(item.quantity)} ${item.unit}`}</Text>
              <Text style={styles.colRate}>{formatMoney(item.unitPrice, invoice.currency)}</Text>
              <Text style={styles.colTax}>{Number(item.taxRate) > 0 ? `${Number(item.taxRate)}%` : "—"}</Text>
              <Text style={styles.colAmount}>{formatMoney(item.lineTotal, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatMoney(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {Number(invoice.discountTotal) > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>-{formatMoney(invoice.discountTotal, invoice.currency)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{settings.vatRegistered ? "VAT" : "Tax"}</Text>
            <Text style={styles.totalsValue}>{formatMoney(invoice.taxTotal, invoice.currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(invoice.total, invoice.currency)}</Text>
          </View>
          {Number(invoice.amountPaid) > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Amount Paid</Text>
              <Text style={styles.totalsValue}>-{formatMoney(invoice.amountPaid, invoice.currency)}</Text>
            </View>
          ) : null}
          <View style={styles.amountDueRow}>
            <Text style={styles.amountDueLabel}>Amount Due</Text>
            <Text style={styles.amountDueValue}>{formatMoney(invoice.amountDue, invoice.currency)}</Text>
          </View>
        </View>

        {payments.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payments Received</Text>
            {payments.map((p) => (
              <Text key={p.id} style={styles.sectionText}>
                {formatDate(p.paymentDate)} — {formatMoney(p.amount, invoice.currency)} ({p.paymentMethod.replace("_", " ")}
                {p.reference ? `, ref: ${p.reference}` : ""})
              </Text>
            ))}
          </View>
        ) : null}

        {invoice.paymentTerms ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Terms</Text>
            <Text style={styles.sectionText}>{invoice.paymentTerms}</Text>
          </View>
        ) : null}

        {settings.paymentInstructions || settings.iban ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Details</Text>
            {settings.paymentInstructions ? <Text style={styles.sectionText}>{settings.paymentInstructions}</Text> : null}
            {settings.bankName ? <Text style={styles.sectionText}>Bank: {settings.bankName}</Text> : null}
            {settings.bankAccountName ? <Text style={styles.sectionText}>Account Name: {settings.bankAccountName}</Text> : null}
            {settings.iban ? <Text style={styles.sectionText}>IBAN: {settings.iban}</Text> : null}
            {settings.bic ? <Text style={styles.sectionText}>BIC: {settings.bic}</Text> : null}
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {settings.invoiceFooter || `${settings.companyName} · ${settings.email ?? ""}`}
        </Text>
      </Page>
    </Document>
  );
}
