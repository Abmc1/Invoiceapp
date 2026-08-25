import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { generateInvoicePdf } from "@/lib/pdf/generate";
import { markPdfGenerated } from "@/lib/services/invoices";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { buffer, filename } = await generateInvoicePdf(id);
    await markPdfGenerated(id, `generated:${filename}`);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate PDF.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
