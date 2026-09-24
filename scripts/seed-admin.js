/**
 * One-time script to create + promote the default MÜLKERA admin account.
 * Requires SUPABASE_SERVICE_ROLE_KEY in your environment (never expose
 * this key to the browser/client).
 *
 * Usage:
 *   node scripts/seed-admin.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = "admin@mulkera.az";
const ADMIN_PASSWORD = "Password123!";

async function run() {
  console.log("Creating MÜLKERA default admin account...");

  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "MÜLKERA Admin", role: "admin" },
  });

  if (error && !error.message.includes("already been registered")) {
    console.error("Error creating admin user:", error.message);
    process.exit(1);
  }

  let userId = data?.user?.id;

  if (!userId) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      console.error(listErr.message);
      process.exit(1);
    }
    const existing = list.users.find((u) => u.email === ADMIN_EMAIL);
    userId = existing?.id;
  }

  if (!userId) {
    console.error("Could not resolve admin user id.");
    process.exit(1);
  }

  const { error: updateErr } = await admin
    .from("users")
    .update({ role: "admin", full_name: "MÜLKERA Admin" })
    .eq("id", userId);

  if (updateErr) {
    console.error("Error promoting user to admin:", updateErr.message);
    process.exit(1);
  }

  console.log("✅ Admin ready:");
  console.log("   email:   " + ADMIN_EMAIL);
  console.log("   password:" + ADMIN_PASSWORD);
}

run();