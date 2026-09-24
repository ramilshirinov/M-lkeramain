import { NextResponse } from "next/server";
import { authenticateUser, getUserProfileById } from "@/lib/backend/db";
import { getSupabaseAdminClient, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabaseServer";

// 1-kliklə demo giriş üçün sabit hesablar (Supabase-də ilk çağırışda avtomatik yaradılır)
const DEMO_ACCOUNTS = {
  admin: { email: "admin@mulkera.az", password: "Mulkera2026!", full_name: "MÜLKERA Admin", role: "admin" },
  realtor: {
    email: "realtor@mulkera.az",
    password: "Mulkera2026!",
    full_name: "Ramil Şirinov",
    role: "realtor",
    agency_name: "MÜLKERA Premium",
  },
  customer: { email: "customer@mulkera.az", password: "Mulkera2026!", full_name: "Test Müştəri", role: "customer" },
};

async function ensureDemoUser(admin, quickRole) {
  const demo = DEMO_ACCOUNTS[quickRole];
  if (!demo) return null;

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let existing = list?.users?.find((u) => u.email === demo.email);

  if (!existing) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.full_name, role: demo.role, agency_name: demo.agency_name || null },
    });
    if (error) throw error;
    existing = created.user;
    await new Promise((r) => setTimeout(r, 300));
    if (demo.role !== "customer") {
      await admin.from("profiles").update({ role: demo.role, status: "approved" }).eq("id", existing.id);
    }
  }

  return demo;
}

/**
 * POST /api/auth/login
 * Real Supabase Auth (signInWithPassword) ilə giriş edir. quickRole verilibsə
 * müvafiq demo hesabı (yoxdursa yaradaraq) istifadə edir. Supabase konfiqurasiya
 * edilməyibsə yerli demo backend-ə keçir.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, quickRole } = body;

    if (isSupabaseConfigured()) {
      try {
        const admin = getSupabaseAdminClient();
        let loginEmail = email;
        let loginPassword = password;

        if (quickRole) {
          const demo = await ensureDemoUser(admin, quickRole);
          if (!demo) throw new Error("Naməlum demo rol");
          loginEmail = demo.email;
          loginPassword = demo.password;
        }

        if (!loginEmail || !loginPassword) {
          return NextResponse.json({ success: false, message: "Email və şifrə daxil edilməlidir." }, { status: 400 });
        }

        const serverClient = getSupabaseServerClient();
        const { data: signInData, error: signInErr } = await serverClient.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (signInErr || !signInData?.user) {
          return NextResponse.json({ success: false, message: "Email və ya şifrə yanlışdır." }, { status: 401 });
        }

        const { data: profile } = await admin.from("profiles").select("*").eq("id", signInData.user.id).maybeSingle();

        const response = NextResponse.json({ success: true, user: signInData.user, profile: profile || signInData.user });
        response.cookies.set("mulkera_user_id", signInData.user.id, {
          path: "/",
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 30,
        });
        return response;
      } catch (sbErr) {
        console.warn("Supabase giriş fallback (demo backend istifadə olunur):", sbErr.message);
      }
    }

    if (quickRole) {
      let targetId = "client-001";
      if (quickRole === "admin") targetId = "admin-001";
      if (quickRole === "realtor") targetId = "r1";
      const user = getUserProfileById(targetId);
      if (user) {
        const response = NextResponse.json({ success: true, user, profile: user });
        response.cookies.set("mulkera_user_id", user.id, {
          path: "/",
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 30,
        });
        return response;
      }
    }

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email və şifrə daxil edilməlidir." }, { status: 400 });
    }

    const user = authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ success: false, message: "Email və ya şifrə yanlışdır." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user, profile: user });
    response.cookies.set("mulkera_user_id", user.id, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || "Giriş zamanı xəta baş verdi." }, { status: 500 });
  }
}
