import { NextResponse } from "next/server";
import { updateUserProfileById, getUserProfileById } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured, getSupabaseServerClient } from "@/lib/supabaseServer";

export async function PUT(req) {
  try {
    const body = await req.json();
    const userIdCookie = req.cookies.get("mulkera_user_id");
    let userId = body.userId || userIdCookie?.value;

    // Check Supabase session if userId is missing
    if (!userId && isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch (e) {
        // ignore
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: "İstifadəçi tapılmadı." }, { status: 401 });
    }

    let updatedProfile = null;

    // 1. Supabase Profiles cədvəlini yeniləyirik
    if (isSupabaseConfigured()) {
      try {
        const adminClient = getSupabaseAdminClient();
        const updates = {
          updated_at: new Date().toISOString(),
        };

        if (body.full_name !== undefined) updates.full_name = body.full_name;
        if (body.phone !== undefined) updates.phone = body.phone;
        if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
        if (body.agency_name !== undefined) updates.agency_name = body.agency_name;
        if (body.commission_rate !== undefined) updates.commission_rate = body.commission_rate;
        if (body.legal_status !== undefined) updates.legal_status = body.legal_status;
        if (body.service_areas !== undefined) updates.service_areas = body.service_areas;
        if (body.specialties !== undefined) updates.specialties = body.specialties;
        if (body.facebook_url !== undefined) updates.facebook_url = body.facebook_url;
        if (body.instagram_url !== undefined) updates.instagram_url = body.instagram_url;
        if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp;
        if (body.email_notifications !== undefined) updates.email_notifications = body.email_notifications;
        if (body.sms_notifications !== undefined) updates.sms_notifications = body.sms_notifications;

        const { data, error } = await adminClient
          .from("profiles")
          .update(updates)
          .eq("id", userId)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedProfile = data;
        }
      } catch (sbErr) {
        console.warn("Supabase profile update warning:", sbErr.message);
      }
    }

    // 2. Daxili verilənlər bazasını da sinxron saxlayırıq
    const localUpdated = updateUserProfileById(userId, body);
    if (!updatedProfile) {
      updatedProfile = localUpdated || getUserProfileById(userId);
    }

    const res = NextResponse.json({
      success: true,
      user: updatedProfile,
      profile: updatedProfile,
      message: "Profil məlumatları uğurla saxlanıldı"
    });

    // Sessiyanın itməməsi üçün cookie-ni qoruyuruq
    if (userId) {
      res.cookies.set("mulkera_user_id", String(userId), {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 gün
      });
    }

    return res;
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
