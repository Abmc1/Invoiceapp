import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { exportInvoicesCsv } from "@/lib/services/export";

export async function GET(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const csv = await exportInvoicesCsv({
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices.csv"`,
    },
  });
}
