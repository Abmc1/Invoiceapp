import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { exportVatReportCsv } from "@/lib/services/export";

export async function GET(request: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !isoDatePattern.test(from) || !isoDatePattern.test(to)) {
    return NextResponse.json({ error: "Both 'from' and 'to' must be dates in YYYY-MM-DD format." }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Both 'from' and 'to' must be valid dates." }, { status: 400 });
  }

  const csv = await exportVatReportCsv({ from: fromDate, to: toDate });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vat-report-${from}-to-${to}.csv"`,
    },
  });
}
