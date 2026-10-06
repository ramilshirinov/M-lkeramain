import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone, agencyName, commissionRate, legalStatus } = body;

    const role = body.role === "realtor" ? "realtor" : "customer"; // 'admin' heç vaxt

    if (!email || !password || password.length < 8 || !fullName) {
      return NextResponse.json(
        { success: false, message: "Bütün məcburi xanaları doldurun (şifrə ən azı 8 simvol olmalıdır)." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        fullName: fullName,
        phone: phone || null,
        role,
        agency_name: agencyName || null,
        agencyName: agencyName || null,
        commission_rate: commissionRate ? String(commissionRate) : null,
        commissionRate: commissionRate ? String(commissionRate) : null,
        legal_status: legalStatus || null,
        legalStatus: legalStatus || null,
      },
    });

    if (createErr) {
      const msg = /already been registered|already exists/i.test(createErr.message || "")
        ? "Bu email ilə artıq hesab mövcuddur."
        : createErr.message;
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    // Try server-side signIn to set SSR cookies
    const sbServer = await getSupabaseServer();
    const { data: signInData, error: signInErr } = await sbServer.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      console.warn("Sign-in after register warning:", signInErr.message);
    }

    // Fetch created profile
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", created.user.id)
      .maybeSingle();

    try {
      const { recordActivity } = await import("@/lib/activityLogger");
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
      await recordActivity({
        action: "AUTH_REGISTER",
        userId: created.user.id,
        userEmail: email,
        userName: fullName,
        role: role,
        details: `Yeni ${role === "realtor" ? "Rieltor" : "Müştəri"} hesabı qeydiyyatdan keçdi`,
        ip: ip.split(",")[0].trim(),
        userAgent: req.headers.get("user-agent") || "",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      user: signInData?.user || created.user,
      profile: profile || { id: created.user.id, email, full_name: fullName, role },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Qeydiyyat zamanı xəta baş verdi." },
      { status: 400 }
    );
  }
}
