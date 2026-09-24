import { NextResponse } from "next/server";
import { createListingReport } from "@/lib/backend/db";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason, details, reporterId } = body;

    const report = createListingReport({
      listingId: id,
      reporterId: reporterId || null,
      reason: reason || "Digər",
      details: details || "",
    });

    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
