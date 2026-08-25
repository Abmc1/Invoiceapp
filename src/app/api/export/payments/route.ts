import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { exportPaymentsCsv } from "@/lib/services/export";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csv = await exportPaymentsCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments.csv"`,
    },
  });
}
