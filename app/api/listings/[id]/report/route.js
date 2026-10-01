import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";

export async function POST(req, { params }) {
  try {
    const { user, sb } = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { reason, details } = body;

    const { data, error } = await sb.from("reports").insert([
      {
        listing_id: id,
        reporter_id: user.id,
        reason: reason || "Digər",
        details: details || "",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]).select().single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, report: data });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status || 500 });
  }
}
