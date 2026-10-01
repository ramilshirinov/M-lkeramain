import { NextResponse } from "next/server";
import { registerNewUser } from "@/lib/backend/db";
import { getSupabaseAdminClient, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone, role = "customer", agencyName, commissionRate, legalStatus } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ success: false, message: "Bütün məcburi xanaları doldurun." }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const admin = getSupabaseAdminClient();

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone: phone || null,
            role: role || "customer",
            agency_name: agencyName || null,
            commission_rate: commissionRate ?? null,
            legal_status: legalStatus || null,
          },
        });

        if (createErr) {
          // Real xətanı dərhal terminalda görmək üçün log edirik:
          console.error("SUPABASE CREATE USER ERROR:", JSON.stringify(createErr, null, 2));
          
          const msg = /already been registered|already exists/i.test(createErr.message || "")
            ? "Bu email ilə artıq hesab mövcuddur."
            : `Supabase xətası: ${createErr.message}`;
            
          return NextResponse.json({ success: false, message: msg }, { status: 400 });
        }

        let profile = null;
        for (let i = 0; i < 4 && !profile; i++) {
          const { data } = await admin.from("profiles").select("*").eq("id", created.user.id).maybeSingle();
          if (data) {
            profile = data;
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        const serverClient = await getSupabaseServerClient();
        const { data: signInData, error: signInErr } = await serverClient.auth.signInWithPassword({ email, password });
        if (signInErr) {
          console.warn("Qeydiyyatdan sonra avtomatik giriş uğursuz oldu:", signInErr.message);
        }

        const response = NextResponse.json({
          success: true,
          user: signInData?.user || created.user,
          profile: profile || { id: created.user.id, email, full_name: fullName, role },
        });
        response.cookies.set("mulkera_user_id", created.user.id, {
          path: "/",
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 30,
        });
        return response;
      } catch (sbErr) {
        console.error("SUPABASE CATCH ERROR:", sbErr);
        return NextResponse.json({ success: false, message: sbErr.message || "Server xətası baş verdi." }, { status: 400 });
      }
    }

    // Əgər Supabase konfiqurasiya olmayıbsa demo backend işləyir:
    const user = registerNewUser({
      email,
      password,
      fullName,
      phone,
      role,
      agencyName,
      commissionRate,
      legalStatus,
    });

    const response = NextResponse.json({ success: true, user, profile: user });
    response.cookies.set("mulkera_user_id", user.id, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    console.error("GENERAL REGISTER ERROR:", err);
    return NextResponse.json({ success: false, message: err.message || "Qeydiyyat zamanı xəta baş verdi." }, { status: 400 });
  }
}