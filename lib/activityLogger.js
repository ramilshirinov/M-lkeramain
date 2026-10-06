import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Əgər Supabase-də audit_logs cədvəli hələ yaradılmayıbsa,
// sistemin kəsintisiz işləməsi üçün son 500 hadisə yaddaşda (in-memory buffer) saxlanılır.
const MEMORY_LOG_LIMIT = 500;
let memoryLogs = [
  {
    id: "seed-1",
    action: "SYSTEM_START",
    user_email: "system@mulkera.az",
    user_name: "Sistem",
    role: "admin",
    details: "Mülkera Admin Nəzarət Sistemi aktivləşdirildi",
    ip: "127.0.0.1",
    user_agent: "Server Internal",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "seed-2",
    action: "PAGE_VISIT",
    user_email: "qonaq@ziyaretci",
    user_name: "Qonaq Ziyarətçi",
    role: "guest",
    details: "Əsas səhifəyə daxil oldu (/)",
    ip: "185.120.45.12",
    user_agent: "Chrome / Windows 11",
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "seed-3",
    action: "PAGE_VISIT",
    user_email: "qonaq@ziyaretci",
    user_name: "Qonaq Ziyarətçi",
    role: "guest",
    details: "Elanlar kataloqunu nəzərdən keçirdi (/listings)",
    ip: "185.120.45.12",
    user_agent: "Chrome / Windows 11",
    created_at: new Date(Date.now() - 1200000).toISOString(),
  },
];

/**
 * Fəaliyyət qeyd edən funksiya (Login, Logout, Page Visit, Listing Add/Edit/Delete və s.)
 */
export async function recordActivity({
  action,
  userId = null,
  userEmail = "qonaq@ziyaretci",
  userName = "Qonaq",
  role = "guest",
  details = "",
  ip = "naməlum",
  userAgent = "naməlum",
}) {
  const logItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    user_id: userId,
    user_email: userEmail || "qonaq@ziyaretci",
    user_name: userName || "Qonaq",
    role: role || "guest",
    details: typeof details === "object" ? JSON.stringify(details) : String(details),
    ip: String(ip || "127.0.0.1").replace("::ffff:", ""),
    user_agent: String(userAgent || "").slice(0, 150),
    created_at: new Date().toISOString(),
  };

  // 1. Yaddaş buferinə əlavə edirik (ən yeni əvvələ)
  memoryLogs.unshift(logItem);
  if (memoryLogs.length > MEMORY_LOG_LIMIT) {
    memoryLogs.pop();
  }

  // 2. Supabase varsa, DB-yə də yazmağa cəhd edirik (xəta atmasın)
  try {
    const admin = getSupabaseAdmin();
    await admin.from("audit_logs").insert({
      action: logItem.action,
      user_id: logItem.user_id,
      user_email: logItem.user_email,
      user_name: logItem.user_name,
      role: logItem.role,
      details: logItem.details,
      ip: logItem.ip,
      user_agent: logItem.user_agent,
    }).catch(() => null);
  } catch {
    // DB cədvəli yoxdursa belə səssiz keçir
  }

  return logItem;
}

/**
 * Son fəaliyyət qeydlərini gətirən funksiya
 */
export async function getRecentActivities(limit = 100, filterAction = null) {
  let dbLogs = [];

  try {
    const admin = getSupabaseAdmin();
    let query = admin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filterAction && filterAction !== "all") {
      query = query.eq("action", filterAction);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      dbLogs = data;
    }
  } catch {
    // fallback to memory
  }

  // DB-də məlumat varsa ondan, yoxdursa yaddaş buferindən istifadə edirik
  let logs = dbLogs.length > 0 ? dbLogs : memoryLogs;

  if (filterAction && filterAction !== "all") {
    logs = logs.filter((l) => l.action === filterAction);
  }

  return logs.slice(0, limit);
}
